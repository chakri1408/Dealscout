import { useCallback, useEffect, useState } from 'react'
import './App.css'
import { fetchMessages, fetchOpportunities, runScan } from './api.ts'
import type { Opportunity } from './api.ts'
import { useLogSocket } from './useLogSocket.ts'
import OpportunitiesTable from './components/OpportunitiesTable.tsx'
import RunScanButton from './components/RunScanButton.tsx'
import ActivityPanel from './components/ActivityPanel.tsx'
import AgentPyramid from './components/AgentPyramid.tsx'
import RunCompleteModal from './components/RunCompleteModal.tsx'
import type { Celebration } from './components/RunCompleteModal.tsx'
import { AGENT_NODE_MAP } from './agentNodes.ts'

function App() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [activeAgent, setActiveAgent] = useState<string | null>(null)
  const [visitedAgents, setVisitedAgents] = useState<string[]>([])
  const [hasNewMessage, setHasNewMessage] = useState(false)
  const [messagesVersion, setMessagesVersion] = useState(0)
  const [celebration, setCelebration] = useState<Celebration | null>(null)

  const handleRunComplete = useCallback((opportunity: Opportunity | null) => {
    setIsRunning(false)
    setActiveAgent(null)
    setVisitedAgents([])
    if (opportunity) {
      setOpportunities((prev) => [opportunity, ...prev])
      setHasNewMessage(true)
      setMessagesVersion((v) => v + 1)
      // Pop the celebration modal with the crafted alert text; fall back to
      // the opportunity's own numbers if the fetch fails.
      fetchMessages()
        .then((messages) => setCelebration({ opportunity, message: messages[0] ?? null }))
        .catch(() => setCelebration({ opportunity, message: null }))
    }
  }, [])

  const { logs, connected } = useLogSocket({ onRunComplete: handleRunComplete })

  // Drive the pyramid from the log stream: the latest log line's agent is
  // the one currently working; agents seen earlier this run stay "visited".
  useEffect(() => {
    if (logs.length === 0) return
    const nodeId = AGENT_NODE_MAP[logs[logs.length - 1].agent]
    if (!nodeId) return
    setActiveAgent(nodeId)
    setVisitedAgents((prev) => (prev.includes(nodeId) ? prev : [...prev, nodeId]))
  }, [logs])

  useEffect(() => {
    fetchOpportunities()
      .then(setOpportunities)
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Failed to load opportunities'))
  }, [])

  const handleRun = async () => {
    setRunError(null)
    try {
      await runScan()
      setIsRunning(true)
      setActiveAgent(null)
      setVisitedAgents([])
      setCelebration(null)
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Failed to start scan')
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>DealScout</h1>
        <RunScanButton isRunning={isRunning} onRun={handleRun} error={runError} />
      </header>

      <main className="app-main">
        <section className="dashboard-grid">
          <div className="dashboard-cell">
            <h2 className="section-title">The Agents</h2>
            <AgentPyramid
              activeAgent={activeAgent}
              visitedAgents={visitedAgents}
              isRunning={isRunning}
            />
          </div>
          <div className="dashboard-cell">
            <h2 className="section-title">Live Activity</h2>
            <ActivityPanel
              logs={logs}
              connected={connected}
              hasNewMessage={hasNewMessage}
              messagesVersion={messagesVersion}
              onMessagesOpened={() => setHasNewMessage(false)}
            />
          </div>
        </section>

        <section className="app-section">
          <h2 className="section-title">Opportunities</h2>
          {loadError && <p className="run-scan-error">{loadError}</p>}
          <OpportunitiesTable opportunities={opportunities} />
        </section>
      </main>

      {celebration && (
        <RunCompleteModal celebration={celebration} onClose={() => setCelebration(null)} />
      )}
    </div>
  )
}

export default App
