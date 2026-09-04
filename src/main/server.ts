import { createServer, type Server as HttpServer } from 'node:http'
import path from 'node:path'
import express, { type Express } from 'express'
import { Server as SocketIOServer, type Socket } from 'socket.io'
import QRCode from 'qrcode'
import { app } from 'electron'
import type {
  ClientToServerEvents,
  ConnectivitySignal,
  Presentation,
  ServerToClientEvents,
  SessionStateMessage
} from '@shared/types'
import { normalizeRoomCode } from '@shared/id'
import { LOCAL_SERVER_PORT } from '@shared/config'
import { getLocalNetworkAddress } from './network'
import { SessionManager } from './sessionManager'
import { isBoolean, isPlainObject, validId, validRoomCode } from './validate'

/** A socket that repeatedly guesses room codes gets disconnected — slows down brute-forcing the 6-digit code without needing a full rate-limiting stack. */
const MAX_FAILED_JOIN_ATTEMPTS = 5

export interface JoinInfo {
  roomCode: string
  presenterToken: string
  port: number
  localAddress: string | null
  joinUrl: string | null
  qrDataUrl: string | null
}

const STUDENT_DEV_PORT = 5173

/**
 * The local server is the heart of Pulse's local-first model: it runs
 * entirely on the instructor's machine, serves the student web app to
 * anyone on the same network, and coordinates the live session over
 * Socket.IO. Nothing here talks to the internet.
 */
export class LocalServer {
  private app: Express
  private http: HttpServer
  private io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>
  private session: SessionManager | null = null
  private port: number | null = null
  private connectivity: ConnectivitySignal = { anyDeviceReached: false, firstReachedAt: null }

  constructor() {
    this.app = express()
    this.http = createServer(this.app)
    // Production only ever needs same-origin sockets (students load the join
    // page from this same server), which browsers don't apply CORS to at
    // all — so a wildcard origin buys nothing there except letting an
    // unrelated website's script quietly probe/join a session in the
    // background if it can reach this machine's LAN address. Dev mode still
    // needs it open because the student page is served from a different
    // port (the Vite dev server).
    this.io = new SocketIOServer(this.http, { cors: { origin: app.isPackaged ? false : '*' } })

    this.configureRoutes()
    this.configureSockets()
  }

  private configureRoutes(): void {
    // The student page is the one thing here actually served to other
    // people's devices over the network — a real (if small) web surface,
    // unlike the instructor's own sandboxed, no-remote-content window. Lock
    // down what it's allowed to load: no inline/remote scripts, no framing.
    this.app.use((_req, res, next) => {
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; img-src 'self' data:; connect-src 'self' ws: wss:; script-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'"
      )
      res.setHeader('X-Frame-Options', 'DENY')
      res.setHeader('X-Content-Type-Options', 'nosniff')
      next()
    })

    if (!app.isPackaged) {
      // In dev, the student page is served by the Vite dev server (also
      // bound to 0.0.0.0), so phones on the LAN can load it directly.
      this.app.get(['/', '/join', '/join/*'], (req, res) => {
        this.markDeviceReached()
        const address = getLocalNetworkAddress() ?? 'localhost'
        const match = req.path.match(/\/join\/([0-9]+)/)
        const query = match ? `?code=${match[1]}` : ''
        res.redirect(`http://${address}:${STUDENT_DEV_PORT}/student.html${query}`)
      })
    } else {
      // Resolved from the app root rather than __dirname: this code can end
      // up bundled at different directory depths depending on the build
      // (e.g. a shared chunk vs. inlined into the entry file), but the app
      // root is always the same.
      const rendererDir = path.join(app.getAppPath(), 'out/renderer')
      this.app.use(express.static(rendererDir))
      // student.html's bundled JS/CSS use relative ("./assets/...") URLs —
      // required so the *instructor's* index.html still works when loaded
      // via file://, since Vite's base path is shared across both pages.
      // That means student.html only resolves its own assets correctly when
      // served at the root path; /join/:code must redirect there rather
      // than serving the file directly, or the browser resolves
      // "./assets/…" against "/join/" and every asset 404s.
      this.app.get(['/', '/join'], (_req, res) => {
        this.markDeviceReached()
        res.sendFile(path.join(rendererDir, 'student.html'))
      })
      this.app.get('/join/*', (req, res) => {
        this.markDeviceReached()
        const match = req.path.match(/\/join\/([0-9]+)/)
        res.redirect(match ? `/student.html?code=${match[1]}` : '/student.html')
      })
    }

    this.app.get('/api/health', (_req, res) => {
      res.json({ ok: true, hasSession: this.session !== null })
    })
  }

  private configureSockets(): void {
    this.io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
      let role: 'student' | 'presenter' | null = null
      let failedJoinAttempts = 0

      /**
       * Every handler below runs code driven by a payload from an
       * unauthenticated device on the network — this app's whole join model
       * (anonymous, no accounts) means anyone with the room code, or anyone
       * who can just guess a payload shape, can hit these. A single
       * unexpected shape or type must never be able to throw past here: an
       * uncaught exception in a socket handler crashes the entire app,
       * ending class for everyone in the room.
       */
      function safe<Args extends unknown[]>(handler: (...args: Args) => void): (...args: Args) => void {
        return (...args: Args) => {
          try {
            handler(...args)
          } catch (err) {
            console.error('[pulse] socket handler error:', err)
          }
        }
      }

      socket.on(
        'student:join',
        safe((payload: unknown, ack) => {
          if (typeof ack !== 'function') return
          if (!this.session) {
            ack({ ok: false, error: 'There is no active session right now.' })
            return
          }
          const roomCode = isPlainObject(payload) ? validRoomCode(payload.roomCode) : null
          if (!roomCode || normalizeRoomCode(roomCode) !== normalizeRoomCode(this.session.roomCode)) {
            failedJoinAttempts += 1
            ack({ ok: false, error: "That code doesn't match the current session." })
            if (failedJoinAttempts >= MAX_FAILED_JOIN_ATTEMPTS) socket.disconnect(true)
            return
          }
          role = 'student'
          socket.join(roomKey(this.session.roomCode))
          this.session.addParticipant(socket.id)
          ack({ ok: true, state: this.session.getState() })
          this.broadcastState()
        })
      )

      socket.on(
        'presenter:hello',
        safe((payload: unknown, ack) => {
          if (typeof ack !== 'function') return
          const presenterToken = isPlainObject(payload) ? validId(payload.presenterToken) : null
          if (!this.session || !presenterToken || presenterToken !== this.session.presenterToken) {
            ack({ ok: false, error: 'Could not connect to the session.' })
            return
          }
          role = 'presenter'
          socket.join(roomKey(this.session.roomCode))
          ack({ ok: true, state: this.session.getState() })
          socket.emit('session:connectivity', this.connectivity)
          this.broadcastResults()
        })
      )

      socket.on(
        'student:respond',
        safe((payload: unknown, ack) => {
          if (typeof ack !== 'function') return
          if (!this.session || role !== 'student') {
            ack({ ok: false, error: 'You are not connected to a session.' })
            return
          }
          const slideId = isPlainObject(payload) ? validId(payload.slideId) : null
          if (!slideId) {
            ack({ ok: false, error: 'That response is not valid for this question.' })
            return
          }
          const result = this.session.recordResponse(socket.id, slideId, isPlainObject(payload) ? payload.value : null)
          ack(result)
          if (result.ok) {
            this.broadcastState()
            this.broadcastResults()
          }
        })
      )

      socket.on(
        'presenter:setSlide',
        safe((payload: unknown) => {
          if (!this.session || role !== 'presenter') return
          const slideId = isPlainObject(payload) ? validId(payload.slideId) : null
          if (!slideId) return
          if (this.session.setSlide(slideId)) {
            this.broadcastState()
            this.broadcastResults()
          }
        })
      )

      socket.on('presenter:openResponses', safe(() => this.withPresenterSession(role, (s) => s.openResponses())))
      socket.on('presenter:closeResponses', safe(() => this.withPresenterSession(role, (s) => s.closeResponses())))
      socket.on('presenter:revealResults', safe(() => this.withPresenterSession(role, (s) => s.revealResults())))
      socket.on('presenter:hideResults', safe(() => this.withPresenterSession(role, (s) => s.hideResults())))
      socket.on(
        'presenter:resetResponses',
        safe(() => this.withPresenterSession(role, (s) => s.resetResponses(), true))
      )
      socket.on(
        'presenter:dismissQuestion',
        safe((payload: unknown) => {
          const questionId = isPlainObject(payload) ? validId(payload.questionId) : null
          if (!questionId) return
          this.withPresenterSession(role, (s) => s.dismissQuestion(questionId), true)
        })
      )
      socket.on(
        'presenter:markQuestionAddressed',
        safe((payload: unknown) => {
          const questionId = isPlainObject(payload) ? validId(payload.questionId) : null
          const addressed = isPlainObject(payload) ? payload.addressed : null
          if (!questionId || !isBoolean(addressed)) return
          this.withPresenterSession(role, (s) => s.markQuestionAddressed(questionId, addressed), true)
        })
      )
      socket.on(
        'presenter:endSession',
        safe(() => {
          if (!this.session || role !== 'presenter') return
          this.io.to(roomKey(this.session.roomCode)).emit('session:ended')
          this.stop()
        })
      )

      socket.on(
        'disconnect',
        safe(() => {
          if (this.session && role === 'student') {
            this.session.removeParticipant(socket.id)
            this.broadcastState()
          }
        })
      )
    })
  }

  private withPresenterSession(role: 'student' | 'presenter' | null, fn: (s: SessionManager) => void, alsoResults = false): void {
    if (!this.session || role !== 'presenter') return
    fn(this.session)
    this.broadcastState()
    if (alsoResults) this.broadcastResults()
  }

  private broadcastState(): void {
    if (!this.session) return
    const state: SessionStateMessage = this.session.getState()
    this.io.to(roomKey(this.session.roomCode)).emit('session:state', state)
  }

  private broadcastResults(): void {
    if (!this.session) return
    const snapshot = this.session.getResultsSnapshot()
    if (snapshot) this.io.to(roomKey(this.session.roomCode)).emit('session:results', snapshot)
  }

  /** Called the instant any device's browser reaches a join route — proof the network path works, regardless of whether they go on to actually join. */
  private markDeviceReached(): void {
    if (this.connectivity.anyDeviceReached) return
    this.connectivity = { anyDeviceReached: true, firstReachedAt: new Date().toISOString() }
    if (this.session) this.io.to(roomKey(this.session.roomCode)).emit('session:connectivity', this.connectivity)
  }

  async start(presentation: Presentation, preferredPort = LOCAL_SERVER_PORT): Promise<JoinInfo> {
    if (!this.port) {
      this.port = await new Promise<number>((resolve, reject) => {
        this.http.once('error', reject)
        this.http.listen(preferredPort, '0.0.0.0', () => {
          const addr = this.http.address()
          resolve(typeof addr === 'object' && addr ? addr.port : preferredPort)
        })
      })
    }

    this.session = new SessionManager(presentation)
    this.connectivity = { anyDeviceReached: false, firstReachedAt: null }
    return this.buildJoinInfo()
  }

  async buildJoinInfo(): Promise<JoinInfo> {
    if (!this.session || !this.port) throw new Error('Session is not active')
    const address = getLocalNetworkAddress()
    const joinUrl = address ? `http://${address}:${this.port}/join/${normalizeRoomCode(this.session.roomCode)}` : null
    const qrDataUrl = joinUrl ? await QRCode.toDataURL(joinUrl, { margin: 1, width: 480 }) : null
    return {
      roomCode: this.session.roomCode,
      presenterToken: this.session.presenterToken,
      port: this.port,
      localAddress: address,
      joinUrl,
      qrDataUrl
    }
  }

  getCurrentJoinInfo(): Promise<JoinInfo> | null {
    return this.session ? this.buildJoinInfo() : null
  }

  hasActiveSession(): boolean {
    return this.session !== null
  }

  stop(): void {
    this.session?.end()
    this.session = null
  }

  async shutdown(): Promise<void> {
    this.stop()
    await new Promise<void>((resolve) => this.http.close(() => resolve()))
  }
}

function roomKey(roomCode: string): string {
  return `room:${normalizeRoomCode(roomCode)}`
}
