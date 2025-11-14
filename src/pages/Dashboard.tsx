// TEST CHANGE JOE
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useClientsStore } from '@store/useClientsStore'
import { useQuotesStore } from '@store/useQuotesStore'
import { db } from '@db/index'
import SectionEditMenu from '@components/SectionEditMenu'
import StatusBadge from '@components/StatusBadge'
import { useLayoutStore } from '@store/useLayoutStore'

const STATUS_ORDER = ['pending', 'approved', 'scheduled', 'in_progress', 'completed', 'canceled']

export default function Dashboard() {
  const navigate = useNavigate()
  const { clients, init: initClients } = useClientsStore()
  const { quotes, init: initQuotes } = useQuotesStore()
  const layout = useLayoutStore()

  const [term, setTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [showAddClient, setShowAddClient] = useState(false)
  const [newClient, setNewClient] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  })
  const [selectedStatus, setSelectedStatus] = useState('')
  const [showMobileExtras, setShowMobileExtras] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  const sliderRef = useRef<HTMLDivElement>(null)
  const [activeSlide, setActiveSlide] = useState(0)
  const quotesCardRef = useRef<HTMLDivElement>(null)

  // track selected clients for bulk delete
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([])

  useEffect(() => {
    initClients()
    initQuotes()
  }, [initClients, initQuotes])

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const filteredClients = useMemo(() => {
    if (!term) return clients
    const q = term.toLowerCase()
    return clients.filter(c =>
      [c.name, c.phone, c.email, c.address]
        .filter(Boolean)
        .some(v => v!.toLowerCase().includes(q)),
    )
  }, [term, clients])

  const filteredQuotes = useMemo(() => {
    const q = term.toLowerCase()
    return quotes.filter(item => {
      const matchesSearch =
        !term ||
        item.id.toLowerCase().includes(q) ||
        (item.notes ?? '').toLowerCase().includes(q)
      const matchesStatus = !statusFilter || item.status === statusFilter
      const matchesDate = (() => {
        const t = item.createdAt
        const after = fromDate ? t >= new Date(fromDate).getTime() : true
        const before =
          toDate ? t <= new Date(toDate).getTime() + 24 * 60 * 60 * 1000 - 1 : true
        return after && before
      })()
      return matchesSearch && matchesStatus && matchesDate
    })
  }, [term, quotes, statusFilter, fromDate, toDate])

  const kpis = useMemo(() => {
    const byStatus: Record<string, number> = {}
    STATUS_ORDER.forEach(s => {
      byStatus[s] = 0
    })
    quotes.forEach(q => {
      byStatus[q.status] = (byStatus[q.status] || 0) + 1
    })
    return byStatus
  }, [quotes])

  const recent = useMemo(() => quotes.slice(-3).reverse(), [quotes])

  const reminders = useMemo(() => {
    const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000
    return quotes.filter(q => q.status === 'pending' && q.createdAt < cutoff).slice(0, 3)
  }, [quotes])

  const clientsPreview = useMemo(
    () => [...filteredClients].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3),
    [filteredClients],
  )

  const quotesPreview = useMemo(() => filteredQuotes.slice(0, 3), [filteredQuotes])

  useEffect(() => {
    if (selectedStatus && quotesCardRef.current) {
      quotesCardRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, [selectedStatus])

  useEffect(() => {
    if (!isMobile) return
    const el = sliderRef.current
    if (!el) return
    const handler = () => {
      const count = el.children.length || 1
      const idx = Math.round((el.scrollLeft / el.scrollWidth) * count)
      setActiveSlide(Math.min(count - 1, Math.max(0, idx)))
    }
    el.addEventListener('scroll', handler, { passive: true })
    return () => el.removeEventListener('scroll', handler)
  }, [isMobile])

  const sections = [
    {
      key: 'clients',
      cfg: layout.section('dashboard', 'clients', 'Clients'),
      hidden: layout.section('dashboard', 'clients', 'Clients').hidden,
      node: (
        <ClientsCard
          clientsPreview={clientsPreview}
          showAddClient={showAddClient}
          setShowAddClient={setShowAddClient}
          newClient={newClient}
          setNewClient={setNewClient}
          selectedClientIds={selectedClientIds}
          setSelectedClientIds={setSelectedClientIds}
        />
      ),
    },
    {
      key: 'recent',
      cfg: layout.section('dashboard', 'recent', 'Recent Activity'),
      hidden: layout.section('dashboard', 'recent', 'Recent Activity').hidden,
      node: <RecentCard recent={recent} />,
    },
    {
      key: 'reminders',
      cfg: layout.section('dashboard', 'reminders', 'Reminders'),
      hidden:
        layout.section('dashboard', 'reminders', 'Reminders').hidden ||
        (isMobile && !showMobileExtras),
      node: <RemindersCard reminders={reminders} />,
    },
    {
      key: 'quotes',
      cfg: layout.section('dashboard', 'quotes', 'Quotes'),
      hidden: layout.section('dashboard', 'quotes', 'Quotes').hidden,
      node: <QuotesCard quotes={quotesPreview} selectedStatus={selectedStatus} />,
    },
  ]

  const visibleSections = sections.filter(s => !s.hidden)

  return (
    <div className={`space-y-6 ${isMobile ? 'pb-28' : ''}`}>
      <StickyBar
        term={term}
        setTerm={setTerm}
        status={statusFilter}
        setStatus={setStatusFilter}
        fromDate={fromDate}
        toDate={toDate}
        setFromDate={setFromDate}
        setToDate={setToDate}
        onAddQuote={() => navigate('/quotes/new')}
      />

      <QuickStats
        byStatus={kpis}
        clients={clients.length}
        quotes={quotes.length}
        activeStatus={selectedStatus}
        isMobile={isMobile}
        onSelectStatus={key => {
          const next = selectedStatus === key ? '' : key
          setSelectedStatus(next)
          setStatusFilter(next)
        }}
        onOpenClients={() => navigate('/clients')}
        onOpenQuotes={() => navigate('/quotes')}
      />

      {isMobile ? (
        <>
          <div ref={sliderRef} className="section-slider">
            {visibleSections.map(section => (
              <div key={section.key} className="section-slide">
                {wrapSection(section)}
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-2">
            {visibleSections.map((_, idx) => (
              <span
                key={idx}
                className={`w-2 h-2 rounded-full ${
                  activeSlide === idx ? 'bg-[var(--color-accent1)]' : 'bg-white/20'
                }`}
              />
            ))}
          </div>

          {!showMobileExtras &&
            !layout.section('dashboard', 'reminders', 'Reminders').hidden && (
              <div className="text-center">
                <button className="btn btn-outline" onClick={() => setShowMobileExtras(true)}>
                  Show More
                </button>
              </div>
            )}
        </>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {visibleSections.map(section => (
            <div key={section.key}>{wrapSection(section)}</div>
          ))}
        </div>
      )}

      {isMobile && (
        <div className="fixed bottom-3 left-0 right-0 px-4 sm:hidden z-30">
          <div className="card flex gap-3">
            <button className="btn btn-gold flex-1" onClick={() => navigate('/quotes/new')}>
              Add Quote
            </button>
            <button className="btn btn-outline flex-1" onClick={() => setShowAddClient(true)}>
              Add Client
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function wrapSection(section: { key: string; cfg: { title: string }; node: JSX.Element }) {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="gold-heading text-lg">{section.cfg.title}</h2>
        <SectionEditMenu page="dashboard" sectionKey={section.key} defaultTitle={section.cfg.title} />
      </div>
      {section.node}
    </div>
  )
}

// ===========================
// CLIENT CARD
// ===========================
function ClientsCard({
  clientsPreview,
  showAddClient,
  setShowAddClient,
  newClient,
  setNewClient,
  selectedClientIds,
  setSelectedClientIds,
}: {
  clientsPreview: any[]
  showAddClient: boolean
  setShowAddClient: (v: boolean) => void
  newClient: any
  setNewClient: (v: any) => void
  selectedClientIds: string[]
  setSelectedClientIds: (v: string[]) => void
}) {
  const toggleSelected = (id: string) => {
    const exists = selectedClientIds.includes(id)
    const next = exists
      ? selectedClientIds.filter(x => x !== id)
      : [...selectedClientIds, id]
    setSelectedClientIds(next)
  }

  const deleteSelected = async () => {
    if (!selectedClientIds.length) return
    if (!confirm(`Delete ${selectedClientIds.length} selected client(s) and their quotes?`)) return

    const store = useClientsStore.getState()
    for (const id of selectedClientIds) {
      await store.remove(id)
    }
    setSelectedClientIds([])
  }

  return (
    <>
      {showAddClient && (
        <div className="space-y-2">
          <input
            className="input"
            placeholder="Name"
            value={newClient.name}
            onChange={e => setNewClient({ ...newClient, name: e.target.value })}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              className="input"
              placeholder="Phone"
              value={newClient.phone}
              onChange={e => setNewClient({ ...newClient, phone: e.target.value })}
            />

            <input
              className="input"
              placeholder="Email"
              value={newClient.email}
              onChange={e => setNewClient({ ...newClient, email: e.target.value })}
            />
          </div>

          <input
            className="input"
            placeholder="Address"
            value={newClient.address}
            onChange={e => setNewClient({ ...newClient, address: e.target.value })}
          />

          <textarea
            className="input"
            placeholder="Notes"
            value={newClient.notes}
            onChange={e => setNewClient({ ...newClient, notes: e.target.value })}
          />
        </div>
      )}

      <div className="section-scroll space-y-3 border-t border-border/40 pt-3">
        {clientsPreview.map(c => {
          const checked = selectedClientIds.includes(c.id)

          return (
            <div key={c.id} className="flex items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--color-accent1)]"
                checked={checked}
                onChange={() => toggleSelected(c.id)}
              />

              <Link to={`/clients/${c.id}`} className="flex-1">
                <div className="font-semibold">{c.name}</div>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {[c.phone, c.email].filter(Boolean).join(' · ')}
                </div>
              </Link>

              <button
                className="btn btn-outline btn-sm"
                onClick={async () => {
                  const count = await db.quotes.where('clientId').equals(c.id).count()
                  if (
                    confirm(
                      count > 0
                        ? `Delete client and ${count} quote(s)?`
                        : 'Delete client?',
                    )
                  ) {
                    await useClientsStore.getState().remove(c.id)
                    setSelectedClientIds(selectedClientIds.filter(id => id !== c.id))
                  }
                }}
              >
                Delete
              </button>
            </div>
          )
        })}

        {!clientsPreview.length && (
          <div className="text-center text-gray-500 py-6">No clients yet.</div>
        )}
      </div>

      <div className="flex items-center justify-between mt-3">
        {selectedClientIds.length > 0 ? (
          <button className="btn btn-outline btn-sm" onClick={deleteSelected}>
            Delete Selected ({selectedClientIds.length})
          </button>
        ) : (
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Showing latest clients
          </span>
        )}

        <Link to="/clients" className="btn btn-outline btn-sm">
          View All
        </Link>
      </div>
    </>
  )
}

// ===========================
// RECENT
// ===========================
function RecentCard({ recent }: { recent: any[] }) {
  return (
    <div className="section-scroll space-y-3 border-t border-border/40 pt-3">
      {recent.map(item => (
        <Link
          key={item.id}
          to={`/quotes/${item.id}`}
          className="block p-3 rounded-lg bg-white/5 hover:bg-white/10 transition"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">{item.id}</div>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {new Date(item.createdAt).toLocaleDateString()}
              </div>
            </div>
            <StatusBadge status={item.status} />
          </div>

          <div className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
            {item.notes || 'No notes'}
          </div>
        </Link>
      ))}

      {!recent.length && <div className="text-center text-gray-500 py-6">No activity yet.</div>}
    </div>
  )
}

// ===========================
// REMINDERS
// ===========================
function RemindersCard({ reminders }: { reminders: any[] }) {
  return (
    <div className="section-scroll space-y-3 border-t border-border/40 pt-3">
      {reminders.map(q => (
        <Link
          key={q.id}
          to={`/quotes/${q.id}`}
          className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10"
        >
          <div>
            <div className="font-semibold">{q.id}</div>
            <div className="text-xs text-amber-300">Pending over 14 days</div>
          </div>
          <StatusBadge status={q.status} />
        </Link>
      ))}

      {!reminders.length && <div className="text-center text-gray-500 py-6">No reminders.</div>}
    </div>
  )
}

// ===========================
// QUOTES CARD
// ===========================
function QuotesCard({ quotes, selectedStatus }: { quotes: any[]; selectedStatus: string }) {
  return (
    <>
      {selectedStatus && (
        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Filtering quotes by status: {selectedStatus.replace('_', ' ')}
        </div>
      )}

      <div className="section-scroll space-y-3 border-t border-border/40 pt-3">
        {quotes.map(q => (
          <Link
            key={q.id}
            to={`/quotes/${q.id}`}
            className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition"
          >
            <div>
              <div className="font-semibold">{q.id}</div>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {q.notes || 'No notes'}
              </div>
            </div>

            <StatusBadge status={q.status} />
          </Link>
        ))}

        {!quotes.length && (
          <div className="text-center text-gray-500 py-6">No quotes found.</div>
        )}
      </div>
    </>
  )
}

// ===========================
// QUICK STATS
// ===========================
function QuickStats({
  byStatus,
  clients,
  quotes,
  activeStatus,
  onSelectStatus,
  isMobile,
  onOpenClients,
  onOpenQuotes,
}: {
  byStatus: Record<string, number>
  clients: number
  quotes: number
  activeStatus: string
  onSelectStatus: (key: string) => void
  isMobile: boolean
  onOpenClients: () => void
  onOpenQuotes: () => void
}) {
  return (
    <div
      className={`grid gap-3 ${
        isMobile ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-8'
      }`}
    >
      {STATUS_ORDER.map(key => (
        <button
          type="button"
          key={key}
          onClick={() => onSelectStatus(key)}
          className={`card p-4 text-center transition ${
            activeStatus === key ? 'ring-2 ring-[var(--color-accent1)]' : ''
          }`}
          style={{ transform: activeStatus === key ? 'scale(1.03)' : undefined }}
        >
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {key.replace('_', ' ')}
          </div>
          <div className="text-2xl font-semibold">{byStatus[key] || 0}</div>
        </button>
      ))}

      {/* Clients tile */}
      <button type="button" className="card p-4 text-center" onClick={onOpenClients}>
        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Clients
        </div>
        <div className="text-2xl font-semibold">{clients}</div>
      </button>

      {/* Quotes tile */}
      <button type="button" className="card p-4 text-center" onClick={onOpenQuotes}>
        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Quotes
        </div>
        <div className="text-2xl font-semibold">{quotes}</div>
      </button>
    </div>
  )
}

// ===========================
// STICKY BAR (SEARCH FIXED)
// ===========================
function StickyBar({
  term,
  setTerm,
  status,
  setStatus,
  fromDate,
  toDate,
  setFromDate,
  setToDate,
  onAddQuote,
}: {
  term: string
  setTerm: (v: string) => void
  status: string
  setStatus: (v: string) => void
  fromDate: string
  toDate: string
  setFromDate: (v: string) => void
  setToDate: (v: string) => void
  onAddQuote: () => void
}) {
  return (
    <div className="sticky top-2 z-10">
      <div className="card p-3 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <div className="flex-1 flex items-center gap-2">
          {/* FIXED SEARCH INPUT */}
          <div className="relative w-full">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-text-muted)]">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
            </span>

            <input
              className="input w-full pl-10 leading-tight"
              placeholder="Search..."
              value={term}
              onChange={e => setTerm(e.target.value)}
            />
          </div>

          {/* STATUS FILTER */}
          <select className="input w-44" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {STATUS_ORDER.map(s => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </select>

          {/* DATE FILTERS */}
          <input
            type="date"
            className="input w-40"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
          />

          <input
            type="date"
            className="input w-40"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
          />
        </div>

        {/* ADD QUOTE BUTTON */}
        <button className="btn btn-gold btn-lg whitespace-nowrap pulse" onClick={onAddQuote}>
          Add Quote
        </button>
      </div>
    </div>
  )
}
