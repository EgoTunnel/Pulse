import { useCallback, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import type { ClientToServerEvents, ResponseValue, ServerToClientEvents, SessionStateMessage } from '@shared/types'
import { LOCAL_SERVER_PORT } from '@shared/config'

type StudentSocket = Socket<ServerToClientEvents, ClientToServerEvents>

export type JoinStatus = 'idle' | 'joining' | 'joined' | 'ended' | 'error'

interface StudentSession {
  status: JoinStatus
  state: SessionStateMessage | null
  error: string | null
  join: (roomCode: string) => void
  respond: (slideId: string, value: ResponseValue) => Promise<{ ok: true } | { ok: false; error: string }>
}

export function useStudentSession(): StudentSession {
  const [status, setStatus] = useState<JoinStatus>('idle')
  const [state, setState] = useState<SessionStateMessage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const socketRef = useRef<StudentSocket | null>(null)

  const join = useCallback((roomCode: string) => {
    setStatus('joining')
    setError(null)

    // Always talk to the local server's own fixed port — the page itself may
    // have been served from a different port (e.g. the Vite dev server).
    const serverUrl = `${window.location.protocol}//${window.location.hostname}:${LOCAL_SERVER_PORT}`
    const socket: StudentSocket = socketRef.current ?? io(serverUrl, { transports: ['websocket', 'polling'] })
    socketRef.current = socket

    function attempt(): void {
      socket.emit('student:join', { roomCode }, (result) => {
        if (result.ok) {
          setState(result.state)
          setStatus('joined')
        } else {
          setStatus('error')
          setError(result.error)
        }
      })
    }

    if (socket.connected) attempt()
    else socket.once('connect', attempt)

    socket.off('session:state').on('session:state', setState)
    socket.off('session:ended').on('session:ended', () => setStatus('ended'))
  }, [])

  const respond = useCallback(
    (slideId: string, value: ResponseValue) =>
      new Promise<{ ok: true } | { ok: false; error: string }>((resolve) => {
        const socket = socketRef.current
        if (!socket) {
          resolve({ ok: false, error: 'Not connected.' })
          return
        }
        socket.emit('student:respond', { slideId, value }, resolve)
      }),
    []
  )

  return { status, state, error, join, respond }
}
