import { useEffect, useState } from 'react'
import { fetchMessages } from '../api.ts'
import type { AgentMessage } from '../api.ts'

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

function formatCreatedAt(createdAt: string): string {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return createdAt
  return dateTimeFormatter.format(date)
}

interface MessagesPanelProps {
  // Bumped by App on every completed run, so an already-open Messages tab
  // refetches instead of going stale (the component also refetches on mount,
  // i.e. every tab switch).
  refreshToken: number
}

export default function MessagesPanel({ refreshToken }: MessagesPanelProps) {
  const [messages, setMessages] = useState<AgentMessage[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMessages()
      .then(setMessages)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load messages'))
  }, [refreshToken])

  if (error) {
    return <p className="messages-status messages-error">{error}</p>
  }
  if (messages === null) {
    return <p className="messages-status">Loading messages…</p>
  }
  if (messages.length === 0) {
    return <p className="messages-status">No alerts yet — run a scan.</p>
  }

  return (
    <div className="messages-list">
      {messages.map((msg) => (
        <article className="message-row" key={msg.id}>
          <div className="message-meta">
            <span className="message-time">{formatCreatedAt(msg.created_at)}</span>
            <span className="message-chips">
              <span className="chip">price {currencyFormatter.format(msg.deal_price)}</span>
              <span className="chip">est {currencyFormatter.format(msg.estimate)}</span>
              <span className="chip chip-gold">save {currencyFormatter.format(msg.discount)}</span>
            </span>
          </div>
          <p className="message-content">{msg.content}</p>
          <a className="message-link" href={msg.deal_url} target="_blank" rel="noopener noreferrer">
            view deal ↗
          </a>
        </article>
      ))}
    </div>
  )
}
