import { useCallback, useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import type {
  ClientToServerEvents,
  FeedbackMessage,
  ResponseValue,
  ServerToClientEvents,
  SessionStateMessage,
  StandingMessage
} from '@shared/types'
import { LOCAL_SERVER_PORT } from '@shared/config'

type StudentSocket = Socket<ServerToClientEvents, ClientToServerEvents>

export type JoinStatus = 'idle' | 'joining' | 'joined' | 'ended' | 'error'

interface StudentSession {
  status: JoinStatus
  state: SessionStateMessage | null
  error: string | null
  /** False while the connection has dropped and socket.io is retrying. */
  connected: boolean
  standing: StandingMessage | null
  feedback: FeedbackMessage | null
  join: (roomCode: string) => void
  respond: (slideId: string, value: ResponseValue) => Promise<{ ok: true } | { ok: false; error: string }>
  setNickname: (nickname: string) => Promise<{ ok: true; nickname: string } | { ok: false; error: string }>
}

const PARTICIPANT_KEY = 'pulse.participantId'

/**
 * A random id for this browser tab, so reconnecting after a Wi-Fi blip
 * rejoins as the same player instead of a new one. sessionStorage (not
 * localStorage) means it dies with the tab — nothing persists across
 * classes. getRandomValues, not randomUUID: the join page is served over
 * plain HTTP on the local network, and randomUUID only exists in secure
 * contexts.
 */
function participantId(): string {
  try {
    const existing = sessionStorage.getItem(PARTICIPANT_KEY)
    if (existing && /^[a-f0-9]{32}$/.test(existing)) return existing
  } catch {
    // Storage unavailable (private mode etc.) — fall through to a fresh id.
  }
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  const id = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  try {
    sessionStorage.setItem(PARTICIPANT_KEY, id)
  } catch {
    // Fine — this tab just won't survive a reload as the same player.
  }
  return id
}

export function useStudentSession(): StudentSession {
  const [status, setStatus] = useState<JoinStatus>('idle')
  const [state, setState] = useState<SessionStateMessage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(true)
  const [standing, setStanding] = useState<StandingMessage | null>(null)
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null)
  const socketRef = useRef<StudentSocket | null>(null)
  const roomCodeRef = useRef<string | null>(null)
  const idRef = useRef<string>(participantId())

  useEffect(() => () => void socketRef.current?.disconnect(), [])

  const emitJoin = useCallback((socket: StudentSocket) => {
    const roomCode = roomCodeRef.current
    if (!roomCode) return
    socket.emit('student:join', { roomCode, participantId: idRef.current }, (result) => {
      if (result.ok) {
        setState(result.state)
        setStatus('joined')
        setError(null)
      } else {
        setStatus('error')
        setError(result.error)
      }
    })
  }, [])

  const join = useCallback(
    (roomCode: string) => {
      setStatus('joining')
      setError(null)
      roomCodeRef.current = roomCode

      let socket = socketRef.current
      if (!socket) {
        // Always talk to the local server's own fixed port — the page itself may
        // have been served from a different port (e.g. the Vite dev server).
        const serverUrl = `${window.location.protocol}//${window.location.hostname}:${LOCAL_SERVER_PORT}`
        socket = io(serverUrl, { transports: ['websocket', 'polling'] })
        socketRef.current = socket
        const s = socket
        // 'connect' fires on every reconnection too, so a dropped connection
        // rejoins the room automatically — without this the server would see
        // a brand-new, roleless socket and silently ignore its answers.
        s.on('connect', () => {
          setConnected(true)
          emitJoin(s)
        })
        s.on('disconnect', () => setConnected(false))
        s.on('session:state', setState)
        s.on('session:ended', () => setStatus('ended'))
        s.on('student:standing', setStanding)
        s.on('student:feedback', setFeedback)
      } else if (socket.connected) {
        emitJoin(socket)
      } else {
        // e.g. the server dropped us after too many wrong codes; socket.io
        // won't auto-reconnect from a server-side disconnect.
        socket.connect()
      }
    },
    [emitJoin]
  )

  const respond = useCallback(
    (slideId: string, value: ResponseValue) =>
      new Promise<{ ok: true } | { ok: false; error: string }>((resolve) => {
        const socket = socketRef.current
        if (!socket?.connected) {
          resolve({ ok: false, error: 'Connection lost — reconnecting. Try again in a moment.' })
          return
        }
        socket.emit('student:respond', { slideId, value }, resolve)
      }),
    []
  )

  const setNickname = useCallback(
    (nickname: string) =>
      new Promise<{ ok: true; nickname: string } | { ok: false; error: string }>((resolve) => {
        const socket = socketRef.current
        if (!socket?.connected) {
          resolve({ ok: false, error: 'Connection lost — reconnecting.' })
          return
        }
        socket.emit('student:setNickname', { nickname }, resolve)
      }),
    []
  )

  return { status, state, error, connected, standing, feedback, join, respond, setNickname }
}
