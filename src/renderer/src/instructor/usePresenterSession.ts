import { useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import type {
  ClientToServerEvents,
  ConnectivitySignal,
  Presentation,
  ResultsSnapshot,
  ServerToClientEvents,
  SessionStateMessage
} from '@shared/types'
import type { JoinInfo } from '../../../main/server'

type PresenterSocket = Socket<ServerToClientEvents, ClientToServerEvents>

interface PresenterSession {
  joinInfo: JoinInfo | null
  state: SessionStateMessage | null
  results: ResultsSnapshot | null
  connectivity: ConnectivitySignal
  connected: boolean
  error: string | null
  setSlide: (slideId: string) => void
  openResponses: () => void
  closeResponses: () => void
  revealResults: () => void
  hideResults: () => void
  resetResponses: () => void
  dismissQuestion: (questionId: string) => void
  markQuestionAddressed: (questionId: string, addressed: boolean) => void
  removeResponse: (responseId: string) => void
  banWord: (word: string) => void
  endSession: () => void
}

/**
 * Starts the local session server, then connects to it as the presenter
 * over Socket.IO — the same real-time channel students use — so the
 * instructor's screen and the classroom always see the same live truth.
 */
export function usePresenterSession(presentation: Presentation): PresenterSession {
  const [joinInfo, setJoinInfo] = useState<JoinInfo | null>(null)
  const [state, setState] = useState<SessionStateMessage | null>(null)
  const [results, setResults] = useState<ResultsSnapshot | null>(null)
  const [connectivity, setConnectivity] = useState<ConnectivitySignal>({ anyDeviceReached: false, firstReachedAt: null })
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const socketRef = useRef<PresenterSocket | null>(null)
  const endedRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    async function connect(): Promise<void> {
      try {
        const info = await window.pulse.session.start(presentation)
        if (cancelled) return
        setJoinInfo(info)

        const socket: PresenterSocket = io(`http://localhost:${info.port}`, { transports: ['websocket'] })
        socketRef.current = socket

        socket.on('connect', () => {
          socket.emit('presenter:hello', { presenterToken: info.presenterToken }, (result) => {
            if (result.ok) {
              setState(result.state)
              setConnected(true)
              setError(null)
            } else {
              setError(result.error)
            }
          })
        })
        socket.on('disconnect', () => setConnected(false))
        socket.on('session:state', setState)
        socket.on('session:results', setResults)
        socket.on('session:connectivity', setConnectivity)
        socket.on('presenter:error', setError)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not start the classroom session.')
      }
    }

    connect()

    return () => {
      cancelled = true
      socketRef.current?.disconnect()
      socketRef.current = null
      if (!endedRef.current) window.pulse.session.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presentation.id])

  return {
    joinInfo,
    state,
    results,
    connectivity,
    connected,
    error,
    setSlide: (slideId) => socketRef.current?.emit('presenter:setSlide', { slideId }),
    openResponses: () => socketRef.current?.emit('presenter:openResponses'),
    closeResponses: () => socketRef.current?.emit('presenter:closeResponses'),
    revealResults: () => socketRef.current?.emit('presenter:revealResults'),
    hideResults: () => socketRef.current?.emit('presenter:hideResults'),
    resetResponses: () => socketRef.current?.emit('presenter:resetResponses'),
    dismissQuestion: (questionId) => socketRef.current?.emit('presenter:dismissQuestion', { questionId }),
    markQuestionAddressed: (questionId, addressed) =>
      socketRef.current?.emit('presenter:markQuestionAddressed', { questionId, addressed }),
    removeResponse: (responseId) => socketRef.current?.emit('presenter:removeResponse', { responseId }),
    banWord: (word) => socketRef.current?.emit('presenter:banWord', { word }),
    endSession: () => {
      endedRef.current = true
      socketRef.current?.emit('presenter:endSession')
    }
  }
}
