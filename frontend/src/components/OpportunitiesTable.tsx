import type { Opportunity } from '../api.ts'

interface OpportunitiesTableProps {
  opportunities: Opportunity[]
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function formatFoundAt(createdAt: string): string {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return createdAt
  return dateFormatter.format(date)
}

export default function OpportunitiesTable({ opportunities }: OpportunitiesTableProps) {
  if (opportunities.length === 0) {
    return (
      <div className="panel opportunities-empty">
        <p>No opportunities yet. Run a scan to find some deals.</p>
      </div>
    )
  }

  return (
    <div className="panel opportunities-panel">
      <div className="table-scroll">
        <table className="opportunities-table">
          <thead>
            <tr>
              <th className="col-description">Description</th>
              <th>Price</th>
              <th>Estimated Value</th>
              <th>Discount</th>
              <th>Link</th>
              <th>Found At</th>
            </tr>
          </thead>
          <tbody>
            {opportunities.map((opp) => (
              <tr key={opp.id}>
                <td className="col-description" title={opp.deal_description}>
                  {opp.deal_description}
                </td>
                <td>{currencyFormatter.format(opp.deal_price)}</td>
                <td>{currencyFormatter.format(opp.estimate)}</td>
                <td className="discount-cell">{currencyFormatter.format(opp.discount)}</td>
                <td>
                  <a href={opp.deal_url} target="_blank" rel="noopener noreferrer">
                    View deal
                  </a>
                </td>
                <td className="found-at-cell">{formatFoundAt(opp.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
