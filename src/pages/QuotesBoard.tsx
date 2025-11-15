import { useEffect, useMemo, useState } from 'react'
import { useQuotesStore } from '@store/useQuotesStore'
import StatusBadge from '@components/StatusBadge'
import { Link, useSearchParams } from 'react-router-dom'

export default function QuotesBoard() {
  const { quotes, init, remove } = useQuotesStore()
  const [params] = useSearchParams()

  const [term, setTerm] = useState('')
  const [status, setStatus] = useState(params.get('status') || '')

  const [selected, setSelected] = useState<string[]>([])

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


  /* SELECTION LOGIC */
  const toggle = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const toggleAll = () => {
    if (selected.length === filtered.length) {
      setSelected([])
    } else {
      setSelected(filtered.map(q => q.id))
    }
  }

  const clearSelection = () => setSelected([])

  const deleteSelected = async () => {
    if (!selected.length) return

    if (!confirm(`Delete ${selected.length} quote(s)?`)) return

    for (const id of selected) {
      await remove(id)
    }
    clearSelection()
  }


  return (
    <div className="p-4 md:p-6 space-y-6">

      {/* SEARCH + STATUS FILTER */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center">

        <div className="w-full md:w-1/2 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
            🔍
          </span>
          <input
            className="input w-full pl-10 pr-3 py-2 rounded-full bg-[#111] border border-[#2a2a2a] focus:border-[#e8d487]"
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


      {/* BULK DELETE BAR */}
      {filtered.length > 0 && (
        <div className="flex justify-between items-center py-2 px-3 bg-black/40 rounded-xl border border-[#2a2a2a]">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selected.length === filtered.length}
              onChange={toggleAll}
            />
            <span className="text-sm text-gray-300">
              Select All
            </span>
          </div>

          {selected.length > 0 && (
            <button
              className="text-red-500 text-sm underline"
              onClick={deleteSelected}
            >
              Delete Selected ({selected.length})
            </button>
          )}
        </div>
      )}
      

      {/* QUOTES LIST */}
      <div
        className="card p-6 rounded-2xl bg-[#101010] border border-[#2a2414] shadow-[0_10px_30px_rgba(0,0,0,0.6)] section-scroll"
        style={{ maxHeight: '70vh' }}
      >

        <div className="space-y-3">
          {filtered.map((q) => (
            <div
              key={q.id}
              className="flex items-center justify-between p-4 rounded-xl bg-black/20 hover:bg-black/40 transition-all"
            >
              {/* CHECKBOX */}
              <input
                type="checkbox"
                className="mr-3"
                checked={selected.includes(q.id)}
                onChange={() => toggle(q.id)}
              />

              {/* CLICKABLE AREA */}
              <Link
                to={`/quotes/${q.id}`}
                className="flex flex-col flex-1 px-3"
              >
                <span className="font-semibold text-[#f5f3da]">
                  {q.clientName || 'Unnamed Client'}
                </span>
                <span className="text-xs text-gray-400">
                  {q.notes || 'No notes'}
                </span>
                <span className="text-[10px] text-gray-500 mt-1">
                  ID: {q.id}
                </span>
              </Link>

              {/* STATUS */}
              <StatusBadge status={q.status} />

              {/* SINGLE DELETE */}
              <button
                onClick={async () => {
                  if (confirm(`Delete quote ${q.id}?`)) {
                    await remove(q.id)
                  }
                }}
                className="ml-4 text-red-500 hover:text-red-400 text-sm"
              >
                ✕
              </button>
            </div>
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
