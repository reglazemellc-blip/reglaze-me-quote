// src/pages/dashboard.tsx
import React, { useEffect, useMemo, useState, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  collection,
  getDocs,
  orderBy,
  query,
  limit,
  DocumentData
} from 'firebase/firestore'
import { db } from '../firebase'

/* ---------------------- Types ---------------------- */
type QuoteStatus =
  | 'pending'
  | 'approved'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'canceled'

type Quote = {
  id: string
  status: QuoteStatus | string
  clientName?: string
  total?: number
  createdAt?: Date
}

type Client = {
  id: string
  name?: string
  email?: string
  phone?: string
  createdAt?: Date
}

type ActivityItem = {
  id: string
  type: 'quote' | 'client'
  label: string
  createdAt?: Date
}

/* ---------------------- Utilities ---------------------- */
const toDateValue = (value: any): Date | undefined => {
  if (!value) return undefined
  if (value.seconds != null) return new Date(value.seconds * 1000)
  if (value instanceof Date) return value
  return undefined
}

/* ---------------------- Card Component ---------------------- */
const Card = ({
  title,
  rightSlot,
  className = '',
  children
}: {
  title?: string
  rightSlot?: ReactNode
  className?: string
  children: ReactNode
}) => (
  <div
    className={`rounded-2xl bg-[#111111] border border-[#2e2e2e] shadow-[0_0_35px_rgba(0,0,0,0.7)] px-5 py-4 ${className}`}
  >
    {(title || rightSlot) && (
      <div className="mb-3 flex items-center justify-between">
        {title && (
          <h2 className="text-sm font-semibold tracking-wide text-[#f4d58d] uppercase">
            {title}
          </h2>
        )}
        {rightSlot && <div>{rightSlot}</div>}
      </div>
    )}
    {children}
  </div>
)

/* ---------------------- Dashboard ---------------------- */
const DashboardPage: React.FC = () => {
  const navigate = useNavigate()

  const [quotes, setQuotes] = useState<Quote[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | QuoteStatus>('all')
  const [fromDateFilter, setFromDateFilter] = useState('')
  const [toDateFilter, setToDateFilter] = useState('')

  /* ---------------------- Load Firestore Data ---------------------- */
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        /* Quotes */
        const quotesRef = collection(db, 'quotes')
        const quotesQuery = query(
          quotesRef,
          orderBy('createdAt', 'desc'),
          limit(50)
        )
        const quotesSnap = await getDocs(quotesQuery)

        const loadedQuotes: Quote[] = quotesSnap.docs.map((doc) => {
          const data = doc.data() as DocumentData
          return {
            id: doc.id,
            status: data.status ?? 'pending',
            clientName: data.clientName ?? data.client_name ?? 'Unknown client',
            total: typeof data.total === 'number' ? data.total : undefined,
            createdAt: toDateValue(data.createdAt)
          }
        })

        /* Clients */
        const clientsRef = collection(db, 'clients')
        const clientsQuery = query(
          clientsRef,
          orderBy('createdAt', 'desc'),
          limit(50)
        )
        const clientsSnap = await getDocs(clientsQuery)

        const loadedClients: Client[] = clientsSnap.docs.map((doc) => {
          const data = doc.data() as DocumentData
          return {
            id: doc.id,
            name:
              data.name ?? data.fullName ?? data.clientName ?? 'Unnamed client',
            email: data.email,
            phone: data.phone,
            createdAt: toDateValue(data.createdAt)
          }
        })

        setQuotes(loadedQuotes)
        setClients(loadedClients)
      } catch (err) {
        console.error('Dashboard load error:', err)
      }
      setLoading(false)
    }

    void load()
  }, [])

  /* ---------------------- Status Counts ---------------------- */
  const statusCounts = useMemo(() => {
    const base = {
      pending: 0,
      approved: 0,
      scheduled: 0,
      in_progress: 0,
      completed: 0,
      canceled: 0
    }

    quotes.forEach((q) => {
      const key = String(q.status).toLowerCase().replace(/\s+/g, '_')
      if (key in base) {
        // @ts-ignore dynamic index
        base[key]++
      }
    })

    return base
  }, [quotes])

  const statusCards = [
    { key: 'pending', label: 'Pending', count: statusCounts.pending },
    { key: 'approved', label: 'Approved', count: statusCounts.approved },
    { key: 'scheduled', label: 'Scheduled', count: statusCounts.scheduled },
    { key: 'in_progress', label: 'In Progress', count: statusCounts.in_progress },
    { key: 'completed', label: 'Completed', count: statusCounts.completed },
    { key: 'canceled', label: 'Canceled', count: statusCounts.canceled },
    { key: 'clients', label: 'Clients', count: clients.length },
    { key: 'quotes', label: 'Quotes', count: quotes.length }
  ]

  /* ---------------------- Recent Activity ---------------------- */
  const recentActivity: ActivityItem[] = useMemo(() => {
    const items: ActivityItem[] = []

    quotes.forEach((q) =>
      items.push({
        id: 'quote-' + q.id,
        type: 'quote',
        label: `${q.clientName} – ${String(q.status).replace(/_/g, ' ')}`,
        createdAt: q.createdAt
      })
    )

    clients.forEach((c) =>
      items.push({
        id: 'client-' + c.id,
        type: 'client',
        label: c.name ?? 'Client created',
        createdAt: c.createdAt
      })
    )

    return items
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
      .slice(0, 10)
  }, [quotes, clients])

  /* ---------------------- Handlers ---------------------- */
  const handleStatusClick = (key: string) => {
    if (key === 'clients') return navigate('/clients')
    if (key === 'quotes') return navigate('/quotes')
    return navigate(`/quotes?status=${key}`)
  }

  const addQuote = () => navigate('/quotes/new')

  /* ---------------------- Render ---------------------- */
  return (
    <div className="min-h-screen bg-[#050505] text-[#f5f5f5]">
      <div className="mx-auto max-w-7xl px-6 pb-10 pt-6">
        {/* Filters */}
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full rounded-full bg-[#111111] px-4 py-2 text-sm text-gray-100 placeholder:text-gray-500 outline-none ring-1 ring-[#2e2e2e] focus:ring-[#f4d58d]"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                ⌕
              </span>
            </div>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as 'all' | QuoteStatus)
            }
            className="h-10 rounded-full bg-[#111111] px-4 text-sm text-gray-100 ring-1 ring-[#2e2e2e] focus:ring-[#f4d58d]"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="canceled">Canceled</option>
          </select>

          {/* Dates */}
          <input
            type="date"
            value={fromDateFilter}
            onChange={(e) => setFromDateFilter(e.target.value)}
            className="h-10 rounded-full bg-[#111111] px-4 text-sm text-gray-100 ring-1 ring-[#2e2e2e] focus:ring-[#f4d58d]"
          />

          <input
            type="date"
            value={toDateFilter}
            onChange={(e) => setToDateFilter(e.target.value)}
            className="h-10 rounded-full bg-[#111111] px-4 text-sm text-gray-100 ring-1 ring-[#2e2e2e] focus:ring-[#f4d58d]"
          />

          {/* Add Quote */}
          <button
            onClick={addQuote}
            className="h-10 rounded-full bg-gradient-to-r from-[#f4d58d] to-[#d6a84f] px-6 text-sm font-semibold text-black shadow-[0_0_25px_rgba(244,213,141,0.45)] hover:brightness-110"
          >
            Add Quote
          </button>
        </div>

        {/* Two Column Layout */}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          {/* LEFT COLUMN */}
          <div className="space-y-6">
            {/* Recent Activity */}
            <Card title="Recent Activity">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-gray-500">No activity yet.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {recentActivity.map((a) => (
                    <li
                      key={a.id}
                      className="flex justify-between rounded-xl bg-black/40 px-3 py-2"
                    >
                      <div>
                        <p className="font-medium">{a.label}</p>
                        {a.createdAt && (
                          <p className="text-[11px] text-gray-500">
                            {a.createdAt.toLocaleString()}
                          </p>
                        )}
                      </div>
                      <span className="rounded-full bg-[#222] px-3 py-1 text-[10px] uppercase text-gray-400">
                        {a.type}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Clients */}
            <Card
              title="Clients"
              rightSlot={
                <button
                  onClick={() => navigate('/clients')}
                  className="text-xs font-semibold text-[#f4d58d] hover:underline"
                >
                  View All
                </button>
              }
              className="max-h-[350px]"
            >
              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 text-sm">
                {clients.length === 0 ? (
                  <p className="text-gray-500">No clients yet.</p>
                ) : (
                  clients.map((client) => (
                    <div
                      key={client.id}
                      className="flex justify-between rounded-xl bg-black/40 px-3 py-2"
                    >
                      <div>
                        <p className="font-medium text-gray-100">
                          {client.name}
                        </p>
                        {(client.email || client.phone) && (
                          <p className="text-[11px] text-gray-500">
                            {client.email ?? client.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Quotes */}
            <Card
              title="Quotes"
              rightSlot={
                <button
                  onClick={() => navigate('/quotes')}
                  className="text-xs font-semibold text-[#f4d58d] hover:underline"
                >
                  View All
                </button>
              }
              className="max-h-[350px]"
            >
              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 text-sm">
                {quotes.length === 0 ? (
                  <p className="text-gray-500">No quotes yet.</p>
                ) : (
                  quotes.map((q) => (
                    <div
                      key={q.id}
                      className="flex justify-between rounded-xl bg-black/40 px-3 py-2"
                    >
                      <div>
                        <p className="font-medium text-gray-100">
                          {q.clientName}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {String(q.status).replace(/_/g, ' ')}
                        </p>
                      </div>
                      {typeof q.total === 'number' && (
                        <span className="text-[#f4d58d] font-semibold">
                          ${q.total.toFixed(2)}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">
            {/* Status grid */}
            <Card title="Overview">
              <div className="grid grid-cols-2 gap-3">
                {statusCards.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => handleStatusClick(s.key)}
                    className="group flex flex-col justify-between rounded-2xl bg-black/60 px-4 py-3 ring-1 ring-[#272727] hover:ring-[#f4d58d]/70 hover:-translate-y-0.5 transition text-left"
                  >
                    <span className="text-[11px] uppercase text-gray-400">
                      {s.label}
                    </span>
                    <span className="text-2xl font-semibold text-[#f4d58d]">
                      {s.count}
                    </span>
                    <span className="text-[10px] text-gray-500 group-hover:text-gray-400">
                      Click to view
                    </span>
                  </button>
                ))}
              </div>
            </Card>

            <Card
              title="Reminders"
              rightSlot={
                <button className="text-xs font-semibold text-[#f4d58d] opacity-70">
                  + Add
                </button>
              }
            >
              <p className="text-sm text-gray-400">
                No reminders yet. Add Firestore support later if needed.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
