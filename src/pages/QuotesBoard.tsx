import { useEffect, useMemo, useState } from 'react'
import { useQuotesStore } from '@store/useQuotesStore'
import StatusBadge from '@components/StatusBadge'
import { Link, useSearchParams } from 'react-router-dom'

export default function QuotesBoard(){
  const { quotes, init } = useQuotesStore()
  const [params] = useSearchParams()
  const [term, setTerm] = useState('')
  const [status, setStatus] = useState(params.get('status') || '')
  useEffect(()=>{ init() }, [init])
  useEffect(()=>{ const p = params.get('status'); if (p) setStatus(p) }, [params])

  const filtered = useMemo(()=>{
    const q = term.toLowerCase()
    return quotes.filter(item => {
      const matchesText = !term || item.id.toLowerCase().includes(q) || (item.notes ?? '').toLowerCase().includes(q)
      const matchesStatus = !status || item.status === status
      return matchesText && matchesStatus
    })
  }, [quotes, term, status])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input className="input" placeholder="Search quotes" value={term} onChange={e=>setTerm(e.target.value)} />
        <select className="input w-48" value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {['pending','approved','scheduled','in_progress','completed','canceled'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
      </div>
      <div className="card p-4 section-scroll" style={{ maxHeight: '70vh' }}>
        <div className="space-y-3">
          {filtered.map(q => (
            <Link key={q.id} to={`/quotes/${q.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition">
              <div>
                <div className="font-semibold">{q.id}</div>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{q.notes || 'No notes'}</div>
              </div>
              <StatusBadge status={q.status} />
            </Link>
          ))}
          {!filtered.length && <div className="text-center text-gray-500 py-6">No quotes match.</div>}
        </div>
      </div>
    </div>
  )
}

