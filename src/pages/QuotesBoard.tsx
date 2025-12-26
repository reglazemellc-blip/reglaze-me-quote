// -------------------------------------------------------------
// QuotesBoard.tsx — FULL NEW VERSION (Search + Preview + Recent)
// -------------------------------------------------------------

import { useEffect, useMemo, useState } from 'react'
import { useQuotesStore } from '@store/useQuotesStore'
import { useClientsStore } from '@store/useClientsStore'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import type { LineItem, WorkflowStatus } from '@db/index'

// Workflow status configuration for display
const workflowStatusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  new: { label: 'New', color: 'text-gray-300', bgColor: 'bg-gray-800 border-gray-600' },
  docs_sent: { label: 'Docs Sent', color: 'text-yellow-300', bgColor: 'bg-yellow-900/50 border-yellow-700/50' },
  waiting_prejob: { label: 'Waiting Pre-Job', color: 'text-orange-300', bgColor: 'bg-orange-900/50 border-orange-700/50' },
  ready_to_schedule: { label: 'Ready to Schedule', color: 'text-cyan-300', bgColor: 'bg-cyan-900/50 border-cyan-700/50' },
  scheduled: { label: 'Scheduled', color: 'text-blue-300', bgColor: 'bg-blue-900/50 border-blue-700/50' },
  in_progress: { label: 'In Progress', color: 'text-indigo-300', bgColor: 'bg-indigo-900/50 border-indigo-700/50' },
  completed: { label: 'Completed', color: 'text-green-300', bgColor: 'bg-green-900/50 border-green-700/50' },
  invoiced: { label: 'Invoiced', color: 'text-purple-300', bgColor: 'bg-purple-900/50 border-purple-700/50' },
  paid: { label: 'Paid', color: 'text-emerald-300', bgColor: 'bg-emerald-900/50 border-emerald-700/50' },
};

export default function QuotesBoard() {
  const navigate = useNavigate()

  const { quotes, init: initQuotes, remove } = useQuotesStore()
  const { clients, init: initClients } = useClientsStore()

  const [params] = useSearchParams()

  const [term, setTerm] = useState('')
  const [status, setStatus] = useState(params.get('status') || 'active')
  const [selected, setSelected] = useState<string[]>([])

  // Load quotes + clients
  useEffect(() => {
    initQuotes()
    initClients()
  }, [initQuotes, initClients])

  // Update status filter when coming from other pages
  useEffect(() => {
    const s = params.get('status')
    if (s) setStatus(s)
  }, [params])

  // Get client by ID (future-proof)
  const clientById = (id?: string | null) =>
    clients.find((c) => c.id === id) || null

  // Suggestions list (contact names)
  const nameSuggestions = useMemo(() => {
    if (!term.trim()) return []
    const t = term.toLowerCase()
    return clients
      .filter((c) => c.name.toLowerCase().includes(t))
      .map((c) => c.name)
  }, [term, clients])

  
/* SORT BY DATE: Recent quotes first */
const sorted = useMemo(() => {
  return [...quotes].sort((a, b) => {
    const at = a.updatedAt ?? a.createdAt ?? 0;
    const bt = b.updatedAt ?? b.createdAt ?? 0;
    return bt - at;
  });
}, [quotes]);



  /* FILTERING */
  const filtered = useMemo(() => {
    const t = term.toLowerCase()

    const matchingClientIds = clients
      .filter((c) => c.name.toLowerCase().includes(t))
      .map((c) => c.id)

    // Define finished statuses
    const finishedStatuses = ['completed', 'invoiced', 'paid']

    return sorted.filter((q) => {
      const matchText =
        !t ||
        q.id.toLowerCase().includes(t) ||
        (q.clientName ?? '').toLowerCase().includes(t) ||
        (q.notes ?? '').toLowerCase().includes(t) ||
        matchingClientIds.includes((q as any).clientId)

      // Use workflowStatus for filtering (fallback to 'new' if not set)
      const quoteWorkflowStatus = (q as any).workflowStatus ?? 'new'
      
      // Handle special "active" filter
      let matchStatus = true
      if (status === 'active') {
        matchStatus = !finishedStatuses.includes(quoteWorkflowStatus)
      } else if (status === 'history') {
        matchStatus = finishedStatuses.includes(quoteWorkflowStatus)
      } else if (status) {
        matchStatus = quoteWorkflowStatus === status
      }

      return matchText && matchStatus
    })
  }, [sorted, term, status, clients])

  /* SELECT/DESELECT */
  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    )
  }

  const toggleAll = () => {
    if (selected.length === filtered.length) {
      setSelected([])
    } else {
      setSelected(filtered.map((q) => q.id))
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
    <div className="p-4 md:p-6 space-y-6 text-[#f5f3da]">

      {/* HEADER + NEW QUOTE */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#e8d487]">Quotes</h1>
          <p className="text-xs text-gray-400">
            View, search, and open recent quotes.
          </p>
        </div>

        <button
          className="btn-gold px-4 py-2 text-sm rounded-full"
          onClick={() => navigate('/quotes/new')}
        >
          + New Quote
        </button>
      </div>

      {/* SEARCH BAR */}
      <div className="card p-4 flex flex-col gap-3">

        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
            🔍
          </span>
          <input
            className="input w-full pl-10 pr-3"
            placeholder="Search client name, quote ID, notes..."
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />

          {/* Contact name suggestions */}
          {nameSuggestions.length > 0 && (
            <div className="absolute z-10 bg-[#111] border border-[#2a2a2a] rounded-md w-full mt-1 max-h-40 overflow-y-auto">
              {nameSuggestions.map((name, i) => (
                <div
                  key={i}
                  className="px-3 py-2 text-sm hover:bg-black/40 cursor-pointer"
                  onClick={() => setTerm(name)}
                >
                  {name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* STATUS FILTER */}
        <select
          className="input w-full md:w-48"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="active">Active Jobs</option>
          <option value="history">History (Completed)</option>
          <option value="">All Quotes</option>
          <option disabled>──────────</option>
          {Object.entries(workflowStatusConfig).map(([value, config]) => (
            <option key={value} value={value}>
              {config.label}
            </option>
          ))}
        </select>
      </div>

      {/* BULK DELETE */}
      {filtered.length > 0 && (
        <div className="flex justify-between items-center py-2 px-3 bg-black/40 rounded-xl border border-[#2a2a2a]">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selected.length === filtered.length}
              onChange={toggleAll}
            />
            <span className="text-sm text-gray-300">Select All</span>
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
      <div className="card p-6 rounded-2xl bg-[#101010] border border-[#2a2414] shadow-[0_10px_30px_rgba(0,0,0,0.6)] max-h-[70vh] overflow-y-auto space-y-3">

        {filtered.map((q) => {
          const dt = q.updatedAt ?? q.createdAt ?? 0
          const dateLabel =
            dt > 0 ? new Date(dt).toLocaleDateString() : 'No date'

          const items: LineItem[] = Array.isArray((q as any).items)
            ? ((q as any).items as LineItem[])
            : []

          const preview = items.slice(0, 3)
          const extra = items.length - preview.length

          // Get workflow status for display
          const wfStatus = ((q as any).workflowStatus as string) || 'new'
          const statusConfig = workflowStatusConfig[wfStatus] || workflowStatusConfig.new

          return (
            <div
              key={q.id}
              className="flex flex-col gap-2 p-4 bg-black/20 rounded-xl hover:bg-black/40 transition-all"
            >

              {/* Top Row: Name + Status + Total */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <span className="font-semibold text-[#f5f3da]">
                    {q.clientName || 'Unnamed Client'}
                  </span>
                  <div className="text-[10px] text-gray-500">
                    {q.quoteNumber || `ID: ${q.id.slice(0, 8)}`}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className={`text-[11px] px-2.5 py-1 rounded-full border ${statusConfig.bgColor} ${statusConfig.color}`}>
                    {statusConfig.label}
                  </span>
                  <div className="text-right">
                    <div className="text-xs text-gray-400">{dateLabel}</div>
                    <div className="text-sm font-semibold text-[#e8d487]">
                      ${Number(q.total ?? 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview Lines */}
              <div className="text-xs text-gray-300 space-y-1">
                {preview.length > 0 ? (
                  preview.map((it) => (
                    <div key={it.id}>
                      • {it.description || 'No description'}{' '}
                      <span className="text-[10px] text-gray-500">
                        (Qty {it.qty}, ${Number(it.unitPrice).toFixed(2)})
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-xs">No line items.</p>
                )}

                {extra > 0 && (
                  <p className="text-[10px] text-gray-500">
                    + {extra} more item{extra > 1 ? 's' : ''}…
                  </p>
                )}

                {/* Notes preview */}
                {q.notes && (
                  <p className="text-[11px] text-gray-500 mt-1">
                    Notes:{' '}
                    {q.notes.length > 80
                      ? q.notes.slice(0, 80) + '...'
                      : q.notes}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2 border-t border-[#2a2a2a]">
                <Link
                  to={`/quotes/${q.id}`}
                  className="text-xs px-3 py-1 rounded border border-[#444] text-gray-200 hover:bg-[#111]"
                >
                  View
                </Link>
                <Link
                  to={`/quotes/${q.id}/edit`}
                  className="text-xs px-3 py-1 rounded border border-[#e8d487] text-[#e8d487] hover:bg-[#3b3412]"
                >
                  Edit
                </Link>

                <button
                  className="ml-auto text-red-500 text-sm"
                  onClick={async () => {
                    if (confirm(`Delete quote ${q.id}?`)) {
                      await remove(q.id)
                    }
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          )
        })}

        {!filtered.length && (
          <div className="text-center text-gray-500 py-6">
            No quotes match.
          </div>
        )}
      </div>
    </div>
  )
}
