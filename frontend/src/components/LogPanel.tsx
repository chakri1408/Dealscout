import { useEffect, useRef } from 'react'
import type { LogEvent } from '../api.ts'
import { colorForAgent } from '../agentColors.ts'

interface LogPanelProps {
  logs: LogEvent[]
}

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return timestamp
  return timeFormatter.format(date)
}

// The log stream body; panel chrome (header, tabs, ws status) lives in
// ActivityPanel, which renders this as its "Activity Log" tab.
export default function LogPanel({ logs }: LogPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [logs])

  return (
    <div className="log-scroll" ref={scrollRef}>
      {logs.length === 0 ? (
        <p className="log-empty">No activity yet. Logs will appear here while a scan runs.</p>
      ) : (
        logs.map((log, i) => {
          const color = colorForAgent(log.agent)
          return (
            <div className="log-line" key={i}>
              <span className="log-timestamp">{formatTimestamp(log.timestamp)}</span>
              <span
                className="log-agent-badge"
                style={{ backgroundColor: `${color}22`, color }}
              >
                {log.agent}
              </span>
              <span className="log-message">{log.message}</span>
            </div>
          )
        })
      )}
    </div>
  )
}
