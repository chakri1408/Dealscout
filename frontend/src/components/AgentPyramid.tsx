import type { CSSProperties, ReactNode } from 'react'
import { AGENT_NODE_COLORS } from '../agentNodes.ts'

interface AgentPyramidProps {
  activeAgent: string | null
  visitedAgents: string[]
  isRunning: boolean
}

interface NodeSpec {
  id: string
  label: string
  cx: number
  cy: number
  icon: ReactNode
}

const R = 26 // node circle radius

// Small stroke icons, drawn in a 24x24 box, evoking each agent's activity.
const icons: Record<string, ReactNode> = {
  planner: (
    // compass
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5 L13.2 13.2 L8.5 15.5 L10.8 10.8 Z" />
    </>
  ),
  scanner: (
    // radar sweep
    <>
      <path d="M3 12 a9 9 0 1 0 9 -9" />
      <path d="M12 12 L12 3" />
      <circle cx="15.5" cy="8" r="1.4" className="icon-fill" />
      <circle cx="12" cy="12" r="1" className="icon-fill" />
    </>
  ),
  ensemble: (
    // balance scales
    <>
      <path d="M12 4 V19" />
      <path d="M6 6.5 H18" />
      <path d="M6 6.5 L3.5 12 a2.6 2.6 0 0 0 5 0 Z" />
      <path d="M18 6.5 L15.5 12 a2.6 2.6 0 0 0 5 0 Z" />
      <path d="M8.5 19.5 H15.5" />
    </>
  ),
  messaging: (
    // envelope
    <>
      <rect x="3" y="6" width="18" height="13" rx="1.5" />
      <path d="M3.5 7 L12 13.5 L20.5 7" />
    </>
  ),
  specialist: (
    // microchip
    <>
      <rect x="6.5" y="6.5" width="11" height="11" rx="1.5" />
      <rect x="10" y="10" width="4" height="4" />
      <path d="M9 6.5 V3.5 M15 6.5 V3.5 M9 20.5 V17.5 M15 20.5 V17.5 M6.5 9 H3.5 M6.5 15 H3.5 M20.5 9 H17.5 M20.5 15 H17.5" />
    </>
  ),
  frontier: (
    // magnifier over stacked docs (RAG search)
    <>
      <path d="M4 6.5 H12 M4 10 H9 M4 13.5 H8.5" />
      <circle cx="14.5" cy="12.5" r="4.5" />
      <path d="M17.8 15.8 L21 19" />
    </>
  ),
  nn: (
    // connected neurons
    <>
      <circle cx="5" cy="12" r="2.2" />
      <circle cx="13" cy="5.5" r="2.2" />
      <circle cx="13" cy="18.5" r="2.2" />
      <circle cx="20" cy="12" r="2.2" />
      <path d="M7 10.8 L11.2 6.6 M7 13.2 L11.2 17.4 M15 6.6 L18.4 10.6 M15 17.4 L18.4 13.4" />
    </>
  ),
}

const nodes: NodeSpec[] = [
  { id: 'planner', label: 'Planner', cx: 240, cy: 46, icon: icons.planner },
  { id: 'scanner', label: 'Scanner', cx: 90, cy: 152, icon: icons.scanner },
  { id: 'ensemble', label: 'Ensemble', cx: 240, cy: 152, icon: icons.ensemble },
  { id: 'messaging', label: 'Messaging', cx: 390, cy: 152, icon: icons.messaging },
  { id: 'specialist', label: 'Specialist', cx: 90, cy: 258, icon: icons.specialist },
  { id: 'frontier', label: 'Frontier', cx: 240, cy: 258, icon: icons.frontier },
  { id: 'nn', label: 'Neural Net', cx: 390, cy: 258, icon: icons.nn },
]

// Lines: planner feeds level 2; ensemble feeds level 3.
const edges: Array<{ from: string; to: string }> = [
  { from: 'planner', to: 'scanner' },
  { from: 'planner', to: 'ensemble' },
  { from: 'planner', to: 'messaging' },
  { from: 'ensemble', to: 'specialist' },
  { from: 'ensemble', to: 'frontier' },
  { from: 'ensemble', to: 'nn' },
]

function nodeById(id: string): NodeSpec {
  return nodes.find((n) => n.id === id)!
}

export default function AgentPyramid({ activeAgent, visitedAgents, isRunning }: AgentPyramidProps) {
  const stateFor = (id: string): string => {
    if (isRunning && activeAgent === id) return 'active'
    if (isRunning && visitedAgents.includes(id)) return 'visited'
    return 'idle'
  }

  return (
    <div className="panel agent-pyramid-panel">
      <svg
        className="agent-pyramid"
        viewBox="0 0 480 312"
        role="img"
        aria-label="Agent hierarchy: the Planner orchestrates Scanner, Ensemble and Messaging agents; the Ensemble combines Specialist, Frontier and Neural Net pricing models"
      >
        {edges.map(({ from, to }) => {
          const a = nodeById(from)
          const b = nodeById(to)
          const lit = isRunning && (activeAgent === to || activeAgent === from)
          return (
            <line
              key={`${from}-${to}`}
              className={`pyr-edge${lit ? ' lit' : ''}`}
              style={lit ? { stroke: AGENT_NODE_COLORS[activeAgent!] } : undefined}
              x1={a.cx}
              y1={a.cy + R}
              x2={b.cx}
              y2={b.cy - R}
            />
          )
        })}
        {nodes.map((n) => (
          <g
            key={n.id}
            className={`pyr-node ${stateFor(n.id)}`}
            style={{ '--node-color': AGENT_NODE_COLORS[n.id] } as CSSProperties}
          >
            {stateFor(n.id) === 'active' && (
              <circle className="pyr-halo" cx={n.cx} cy={n.cy} r={R} />
            )}
            <circle className="pyr-circle" cx={n.cx} cy={n.cy} r={R} />
            <g className="pyr-icon" transform={`translate(${n.cx - 12}, ${n.cy - 12})`}>
              {n.icon}
            </g>
            <text className="pyr-label" x={n.cx} y={n.cy + R + 17} textAnchor="middle">
              {n.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
