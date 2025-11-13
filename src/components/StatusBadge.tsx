import { QuoteStatus } from '@db/index'

export default function StatusBadge({ status }: { status: QuoteStatus }){
  return <span className={`status-badge status-${status}`}>{status.replace('_',' ')}</span>
}

