import { useEffect, useRef, useState } from 'react'
import { connectLogSocket, isRunCompleteEvent } from './api.ts'
import type { LogEvent, Opportunity } from './api.ts'

const MAX_LOG_ENTRIES = 500
const INITIAL_RECONNECT_DELAY_MS = 1000
const MAX_RECONNECT_DELAY_MS = 15000

interface UseLogSocketOptions {
  onRunComplete?: (opportunity: Opportunity | null) => void
}

export function useLogSocket({ onRunComplete }: UseLogSocketOptions = {}) {
  const [logs, setLogs] = useState<LogEvent[]>([])
  const [connected, setConnected] = useState(false)
  const onRunCompleteRef = useRef(onRunComplete)
  onRunCompleteRef.current = onRunComplete

  useEffect(() => {
    let cancelled = false
    let socket: WebSocket | null = null
    let reconnectDelay = INITIAL_RECONNECT_DELAY_MS
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    const connect = () => {
      if (cancelled) return
      socket = connectLogSocket((event) => {
        if (isRunCompleteEvent(event)) {
          onRunCompleteRef.current?.(event.opportunity)
          return
        }
        setLogs((prev) => {
          const next = [...prev, event]
          if (next.length > MAX_LOG_ENTRIES) {
            return next.slice(next.length - MAX_LOG_ENTRIES)
          }
          return next
        })
      })

      socket.onopen = () => {
        reconnectDelay = INITIAL_RECONNECT_DELAY_MS
        setConnected(true)
      }

      socket.onclose = () => {
        setConnected(false)
        if (cancelled) return
        reconnectTimer = setTimeout(connect, reconnectDelay)
        reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY_MS)
      }

      socket.onerror = () => {
        socket?.close()
      }
    }

    connect()

    return () => {
      cancelled = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      socket?.close()
    }
  }, [])

  return { logs, connected }
}
