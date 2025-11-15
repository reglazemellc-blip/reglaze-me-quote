import { useEffect, useMemo, useState } from 'react'
import { useQuotesStore } from '@store/useQuotesStore'
import StatusBadge from '@components/StatusBadge'
import { Link, useSearchParams } from 'react-router-dom'

export default function QuotesBoard() {
  const { quotes, init } = useQuotesStore()
  const [params] = useSearchParams()

  const [term, setTerm] = useState('')
  const [status, setStatus] = useState(params.get('status') || '')

  useEffect(() => { init() }, [init])
  useEffect(() => {
    const s = params.get('status')
    if (s) setStatus(s)
  }, [params])

  /* FILTERING */
  const filtered = useMemo(() => {
    const t = term.toLowerCase()
    return quotes.filter(q => {
      const matchText =
        !term ||
        q.id.toLowerCase().includes(t) ||
        (q.clientName ?? '').toLowerCase().includes(t) ||
        (q.notes ?? '').toLowerCase().includes(t)

      const matchStatus = !status || q.status === status

      return matchText && matchStatus
    })
  }, [quotes, term, status])

  return (
    <div className="p-4 md:p-6 space-y-6">

      {/* SEARCH + STATUS FILTER */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center">

        <div className="w-full md:w-1/2 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
            🔍
          </span>
          <input
            className="input w-full pl-8 pr-3 py-2 rounded-full bg-[#111] border border-[#2a2a2a] focus:border-[#e8d487]"
            placeholder="Search quotes..."
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
        </div>

        <select
          className="input w-full md:w-48 py-2 rounded-full bg-[#111] border border-[#2a2a2a] focus:border-[#e8d487]"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          {[
            'pending',
            'approved',
            'scheduled',
            'in_progress',
            'completed',
            'canceled',
          ].map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* QUOTES LIST */}
      <div className="card p-6 rounded-2xl bg-[#101010] border border-[#2a2414] shadow-[0_10px_30px_rgba(0,0,0,0.6)] section-scroll"
           style={{ maxHeight: '70vh' }}>

        <div className="space-y-3">
          {filtered.map((q) => (
            <Link
              key={q.id}
              to={`/quotes/${q.id}`}
              className="flex items-center justify-between p-4 rounded-xl bg-black/20 hover:bg-black/40 transition-all"
            >
              <div className="flex flex-col">
                <span className="font-semibold text-[#f5f3da]">
                  {q.clientName || 'Unnamed Client'}
                </span>
                <span className="text-xs text-gray-400">
                  {q.notes || 'No notes'}
                </span>
                <span className="text-[10px] text-gray-500 mt-1">
                  ID: {q.id}
                </span>
              </div>

              <StatusBadge status={q.status} />
            </Link>
          ))}

          {!filtered.length && (
            <div className="text-center text-gray-500 py-6">
              No quotes match.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
