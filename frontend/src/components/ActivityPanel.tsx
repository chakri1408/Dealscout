import { useState } from 'react'
import type { LogEvent } from '../api.ts'
import LogPanel from './LogPanel.tsx'
import MessagesPanel from './MessagesPanel.tsx'

interface ActivityPanelProps {
  logs: LogEvent[]
  connected: boolean
  hasNewMessage: boolean
  messagesVersion: number
  onMessagesOpened: () => void
}

type Tab = 'logs' | 'messages'

export default function ActivityPanel({
  logs,
  connected,
  hasNewMessage,
  messagesVersion,
  onMessagesOpened,
}: ActivityPanelProps) {
  const [tab, setTab] = useState<Tab>('logs')

  const openMessages = () => {
    setTab('messages')
    onMessagesOpened()
  }

  return (
    <div className="panel log-panel">
      <div className="log-panel-header">
        <div className="panel-tabs">
          <button
            className={`panel-tab${tab === 'logs' ? ' panel-tab-active' : ''}`}
            onClick={() => setTab('logs')}
          >
            Activity Log
          </button>
          <button
            className={`panel-tab${tab === 'messages' ? ' panel-tab-active' : ''}`}
            onClick={openMessages}
          >
            Messages
            {hasNewMessage && <span className="tab-dot" aria-label="new message" />}
          </button>
        </div>
        <span className={`ws-status ${connected ? 'ws-connected' : 'ws-disconnected'}`}>
          {connected ? 'live' : 'disconnected'}
        </span>
      </div>
      {tab === 'logs' ? <LogPanel logs={logs} /> : <MessagesPanel refreshToken={messagesVersion} />}
    </div>
  )
}
