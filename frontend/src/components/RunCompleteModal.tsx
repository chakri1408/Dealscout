import { useEffect } from 'react'
import type { AgentMessage, Opportunity } from '../api.ts'

export interface Celebration {
  opportunity: Opportunity
  message: AgentMessage | null
}

interface RunCompleteModalProps {
  celebration: Celebration
  onClose: () => void
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

export default function RunCompleteModal({ celebration, onClose }: RunCompleteModalProps) {
  const { opportunity, message } = celebration

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-gradient" aria-hidden="true" />
        <h2 className="modal-title">🎉 Deal found!</h2>
        <p className="modal-message">
          {message ? message.content : opportunity.deal_description}
        </p>
        <div className="modal-chips">
          <span className="chip">price {currencyFormatter.format(opportunity.deal_price)}</span>
          <span className="chip">est {currencyFormatter.format(opportunity.estimate)}</span>
          <span className="chip chip-save">save {currencyFormatter.format(opportunity.discount)}</span>
        </div>
        <div className="modal-actions">
          <a
            className="modal-view-deal"
            href={opportunity.deal_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            View deal ↗
          </a>
          <button className="modal-close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
