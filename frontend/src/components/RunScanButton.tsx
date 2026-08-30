interface RunScanButtonProps {
  isRunning: boolean
  onRun: () => void
  error: string | null
}

export default function RunScanButton({ isRunning, onRun, error }: RunScanButtonProps) {
  return (
    <div className="run-scan">
      <button className="run-scan-button" onClick={onRun} disabled={isRunning}>
        {isRunning ? (
          <>
            <span className="spinner" aria-hidden="true" />
            Scan running...
          </>
        ) : (
          'Run Scan'
        )}
      </button>
      {error && <span className="run-scan-error">{error}</span>}
    </div>
  )
}
