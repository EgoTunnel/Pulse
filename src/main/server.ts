import { createServer, type Server as HttpServer } from 'node:http'
import path from 'node:path'
import express, { type Express } from 'express'
import { Server as SocketIOServer, type Socket } from 'socket.io'
import QRCode from 'qrcode'
import { app } from 'electron'
import type {
  ClientToServerEvents,
  Presentation,
  ServerToClientEvents,
  SessionStateMessage
} from '@shared/types'
import { normalizeRoomCode } from '@shared/id'
import { LOCAL_SERVER_PORT } from '@shared/config'
import { getLocalNetworkAddress } from './network'
import { SessionManager } from './sessionManager'

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

  constructor() {
    this.app = express()
    this.http = createServer(this.app)
    this.io = new SocketIOServer(this.http, { cors: { origin: '*' } })

    this.configureRoutes()
    this.configureSockets()
  }

  private configureRoutes(): void {
    if (!app.isPackaged) {
      // In dev, the student page is served by the Vite dev server (also
      // bound to 0.0.0.0), so phones on the LAN can load it directly.
      this.app.get(['/', '/join', '/join/*'], (req, res) => {
        const address = getLocalNetworkAddress() ?? 'localhost'
        const match = req.path.match(/\/join\/([0-9]+)/)
        const query = match ? `?code=${match[1]}` : ''
        res.redirect(`http://${address}:${STUDENT_DEV_PORT}/student.html${query}`)
      })
    } else {
      const rendererDir = path.join(__dirname, '../renderer')
      this.app.use(express.static(rendererDir))
      this.app.get(['/', '/join', '/join/*'], (_req, res) => {
        res.sendFile(path.join(rendererDir, 'student.html'))
      })
    }

    this.app.get('/api/health', (_req, res) => {
      res.json({ ok: true, hasSession: this.session !== null })
    })
  }

  private configureSockets(): void {
    this.io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
      let role: 'student' | 'presenter' | null = null

      socket.on('student:join', ({ roomCode }, ack) => {
        if (!this.session) {
          ack({ ok: false, error: 'There is no active session right now.' })
          return
        }
        if (normalizeRoomCode(roomCode) !== normalizeRoomCode(this.session.roomCode)) {
          ack({ ok: false, error: "That code doesn't match the current session." })
          return
        }
        role = 'student'
        socket.join(roomKey(this.session.roomCode))
        this.session.addParticipant(socket.id)
        ack({ ok: true, state: this.session.getState() })
        this.broadcastState()
      })

      socket.on('presenter:hello', ({ presenterToken }, ack) => {
        if (!this.session || presenterToken !== this.session.presenterToken) {
          ack({ ok: false, error: 'Could not connect to the session.' })
          return
        }
        role = 'presenter'
        socket.join(roomKey(this.session.roomCode))
        ack({ ok: true, state: this.session.getState() })
        this.broadcastResults()
      })

      socket.on('student:respond', ({ slideId, value }, ack) => {
        if (!this.session || role !== 'student') {
          ack({ ok: false, error: 'You are not connected to a session.' })
          return
        }
        const result = this.session.recordResponse(socket.id, slideId, value)
        ack(result)
        if (result.ok) {
          this.broadcastState()
          this.broadcastResults()
        }
      })

      socket.on('presenter:setSlide', ({ slideId }) => {
        if (!this.session || role !== 'presenter') return
        if (this.session.setSlide(slideId)) {
          this.broadcastState()
          this.broadcastResults()
        }
      })

      socket.on('presenter:openResponses', () => this.withPresenterSession(role, (s) => s.openResponses()))
      socket.on('presenter:closeResponses', () => this.withPresenterSession(role, (s) => s.closeResponses()))
      socket.on('presenter:revealResults', () => this.withPresenterSession(role, (s) => s.revealResults()))
      socket.on('presenter:hideResults', () => this.withPresenterSession(role, (s) => s.hideResults()))
      socket.on('presenter:resetResponses', () => this.withPresenterSession(role, (s) => s.resetResponses(), true))
      socket.on('presenter:endSession', () => {
        if (!this.session || role !== 'presenter') return
        this.io.to(roomKey(this.session.roomCode)).emit('session:ended')
        this.stop()
      })

      socket.on('disconnect', () => {
        if (this.session && role === 'student') {
          this.session.removeParticipant(socket.id)
          this.broadcastState()
        }
      })
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
