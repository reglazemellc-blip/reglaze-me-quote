import { useClientsStore } from '@store/useClientsStore'
import { useQuotesStore } from '@store/useQuotesStore'
import { useEffect, useMemo, useState } from 'react'
import SearchBar from '@components/SearchBar'
import { Link, useNavigate } from 'react-router-dom'

export default function Clients() {
  const { clients, init, remove } = useClientsStore()
  const { quotes } = useQuotesStore()

  const [term, setTerm] = useState('')
  const navigate = useNavigate()

  const [selected, setSelected] = useState<string[]>([])

  useEffect(() => {
    init()
  }, [init])

  /* ---------------- FILTER CLIENT LIST ---------------- */
  const filtered = useMemo(() => {
    const arr = [...clients]
    if (!term.trim()) return arr

    const q = term.toLowerCase()

    return arr.filter((c) =>
      [c.name, c.phone, c.email, c.address]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q))
    )
  }, [clients, term])

  /* ---------------- SELECTION LOGIC ---------------- */
  const toggle = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const toggleAll = () => {
    if (selected.length === filtered.length) {
      setSelected([])
    } else {
      setSelected(filtered.map(c => c.id))
    }
  }

  const clearSelection = () => setSelected([])

  const deleteSelected = async () => {
    if (!selected.length) return

    // Count total quotes across all selected clients
    const totalQuotes = quotes.filter(q => selected.includes(q.clientId)).length

    const msg =
      totalQuotes > 0
        ? `Delete ${selected.length} clients AND ${totalQuotes} associated quote(s)?`
        : `Delete ${selected.length} clients?`

    if (!confirm(msg)) return

    for (const id of selected) {
      await remove(id)
    }

    clearSelection()
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-[#e8d487]">Clients</h2>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex-1 md:flex-none">
            <SearchBar
              placeholder="Search by name, phone, email, address"
              onChange={setTerm}
            />
          </div>

          <button
            className="btn-gold"
            onClick={() => navigate('/clients/new')}
          >
            Add Client
          </button>
        </div>
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

      {/* CLIENT LIST */}
      <div className="card p-4 divide-y divide-[#2a2a2a]">
        {filtered.map((c) => {
          // Count quotes linked to this client
          const count = quotes.filter(q => q.clientId === c.id).length

          return (
            <div
              key={c.id}
              className="flex items-center justify-between py-3 hover:bg-white/5 rounded-lg px-2 transition"
            >
              {/* CHECKBOX */}
              <input
                type="checkbox"
                className="mr-3"
                checked={selected.includes(c.id)}
                onChange={() => toggle(c.id)}
              />

              {/* CLIENT INFO */}
              <Link to={`/clients/${c.id}`} className="flex-1 mr-3">
                <div className="font-medium text-[#f5f3da]">{c.name}</div>
                <div className="text-xs text-gray-400">
                  {[c.phone, c.email, c.address].filter(Boolean).join(' • ')}
                </div>
                <div className="text-[11px] text-gray-500 mt-1">
                  {count} quote{count !== 1 ? 's' : ''}
                </div>
              </Link>

              {/* SINGLE DELETE */}
              <button
                className="text-red-500 hover:text-red-400 text-sm"
                onClick={async () => {
                  const msg =
                    count > 0
                      ? `Delete this client AND ${count} quote(s)?`
                      : 'Delete this client?'

                  if (confirm(msg)) {
                    await remove(c.id)
                  }
                }}
              >
                ✕
              </button>
            </div>
          )
        })}

        {!filtered.length && (
          <div className="text-center text-gray-500 py-6 text-sm">
            No clients found.
          </div>
        )}
      </div>
    </div>
  )
}
