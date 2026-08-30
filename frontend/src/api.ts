const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'
const WS_URL = `${API_BASE.replace(/^http/, 'ws')}/ws/logs`

export interface Opportunity {
  id: number
  deal_description: string
  deal_price: number
  deal_url: string
  estimate: number
  discount: number
  created_at: string
}

export interface LogEvent {
  timestamp: string
  agent: string
  level: string
  message: string
}

export interface RunCompleteEvent {
  type: 'run_complete'
  opportunity: Opportunity | null
}

export type LogSocketEvent = LogEvent | RunCompleteEvent

export interface AgentMessage {
  id: number
  content: string
  deal_url: string
  deal_price: number
  estimate: number
  discount: number
  created_at: string
}

export interface RunScanResponse {
  status: string
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init)
  if (!res.ok) {
    throw new Error(`Request to ${path} failed: ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

export function fetchOpportunities(): Promise<Opportunity[]> {
  return fetchJson<Opportunity[]>('/api/opportunities')
}

export function fetchOpportunity(id: number): Promise<Opportunity> {
  return fetchJson<Opportunity>(`/api/opportunities/${id}`)
}

export function runScan(): Promise<RunScanResponse> {
  return fetchJson<RunScanResponse>('/api/scan/run', { method: 'POST' })
}

export function fetchMessages(): Promise<AgentMessage[]> {
  return fetchJson<AgentMessage[]>('/api/messages')
}

export function isRunCompleteEvent(event: LogSocketEvent): event is RunCompleteEvent {
  return 'type' in event && event.type === 'run_complete'
}

export function connectLogSocket(onEvent: (event: LogSocketEvent) => void): WebSocket {
  const socket = new WebSocket(WS_URL)
  socket.onmessage = (msg: MessageEvent<string>) => {
    try {
      const data = JSON.parse(msg.data) as LogSocketEvent
      onEvent(data)
    } catch (err) {
      console.error('Failed to parse log socket message', err, msg.data)
    }
  }
  return socket
}
