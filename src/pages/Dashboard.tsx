import React, { useEffect, useMemo, useState, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  collection,
  getDocs,
  orderBy,
  query,
  limit,
  DocumentData,
  deleteDoc,
  doc
} from 'firebase/firestore'
import { db } from '../firebase'

/* TYPES ---------------------------------------------------- */
type QuoteStatus =
  | 'pending'
  | 'approved'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'canceled'

type Quote = {
  id: string
  clientId: string
  clientName: string
  status: QuoteStatus | string
  total?: number
  createdAt?: Date
}

type Client = {
  id: string
  name: string
  phone?: string
  email?: string
  createdAt?: Date
}

/* UTIL ----------------------------------------------------- */
const toDateValue = (value: any): Date | undefined => {
  if (!value) return undefined
  if (value.seconds != null) return new Date(value.seconds * 1000)
  if (value instanceof Date) return value
  return undefined
}

/* CARD ----------------------------------------------------- */
const Card = ({
  title,
  rightSlot,
  children
}: {
  title?: string
  rightSlot?: ReactNode
  children: ReactNode
}) => (
  <div className="rounded-2xl bg-[#151515] border border-[#2a2414] shadow-[0_10px_25px_rgba(0,0,0,0.55)] p-4 md:p-5 space-y-3">
    {(title || rightSlot) && (
      <div className="flex justify-between items-center mb-1">
        {title && (
          <h2 className="font-semibold text-sm md:text-base tracking-wide text-[#f5f3da] border-l-2 border-[#e8d487] pl-2">
            {title}
          </h2>
        )}
        {rightSlot && (
          <div className="flex items-center gap-2">{rightSlot}</div>
        )}
      </div>
    )}
    {children}
  </div>
)

/* DASHBOARD ------------------------------------------------ */
export default function DashboardPage() {
  const navigate = useNavigate()

  const [quotes, setQuotes] = useState<Quote[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  /* LOAD DATA */
  useEffect(() => {
    const load = async () => {
      setLoading(true)

      // Quotes
      const qSnap = await getDocs(
        query(collection(db, 'quotes'), orderBy('createdAt', 'desc'), limit(20))
      )
      setQuotes(
        qSnap.docs.map((d) => {
          const data = d.data() as DocumentData
          return {
            id: d.id,
            clientId: data.clientId,
            clientName: data.clientName ?? 'Unnamed',
            status: data.status ?? 'pending',
            total: data.total ?? 0,
            createdAt: toDateValue(data.createdAt)
          }
        })
      )

      // Clients
      const cSnap = await getDocs(
        query(collection(db, 'clients'), orderBy('createdAt', 'desc'), limit(20))
      )
      setClients(
        cSnap.docs.map((d) => {
          const data = d.data() as DocumentData
          return {
            id: d.id,
            name: data.name ?? 'Unnamed',
            phone: data.phone,
            email: data.email,
            createdAt: toDateValue(data.createdAt)
          }
        })
      )

      setLoading(false)
    }

    load()
  }, [])

  /* COUNTS */
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
      const s = String(q.status).toLowerCase() as keyof typeof base
      if (base[s] !== undefined) base[s]++
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

  /* DELETE FUNCTIONS */
  async function deleteQuote(id: string) {
    if (!confirm('Delete this quote?')) return
    await deleteDoc(doc(db, 'quotes', id))
    setQuotes((prev) => prev.filter((q) => q.id !== id))
  }

  async function deleteClient(id: string) {
    if (!confirm('Delete client and ALL their quotes?')) return
    await deleteDoc(doc(db, 'clients', id))
    const toRemove = quotes.filter((q) => q.clientId === id)
    for (const q of toRemove) {
      await deleteDoc(doc(db, 'quotes', q.id))
    }
    setClients((prev) => prev.filter((c) => c.id !== id))
    setQuotes((prev) => prev.filter((q) => q.clientId !== id))
  }

  if (loading) return <div className="text-gray-400 p-6">Loading...</div>

  /* RENDER ------------------------------------------------ */
  return (
    <div className="p-4 md:p-6 space-y-6">

      {/* SEARCH + ADD QUOTE */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center">
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input w-full md:w-1/2 bg-[#111] border border-[#333] rounded-full px-8 py-2 text-gray-200"
          placeholder="Search clients or quotes..."
        />
        <button
          className="btn btn-primary rounded-full px-5"
          onClick={() => navigate('/quotes/new')}
        >
          + Add Quote
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">

        {/* LEFT SIDE */}
        <div className="space-y-6">

          {/* CLIENTS */}
          <Card
            title="Clients"
            rightSlot={
              <button
                className="btn btn-primary btn-sm rounded-full px-3"
                onClick={() => navigate('/clients/new')}
              >
                + Add
              </button>
            }
          >
            <div className="space-y-2">
              {clients.slice(0, 4).map((c) => (
                <div
                  key={c.id}
                  className="flex justify-between items-center p-3 rounded-xl bg-black/25 hover:bg-black/60 transition text-gray-200"
                >
                  <div
                    className="cursor-pointer"
                    onClick={() => navigate(`/clients/${c.id}`)}
                  >
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-gray-400">{c.email || ''}</div>
                  </div>

                  <button
                    className="text-red-500 hover:text-red-300"
                    onClick={() => deleteClient(c.id)}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </Card>

          {/* QUOTES — NOW YOUR "RECENT ACTIVITY" */}
          <Card
            title="Recent Quotes"
            rightSlot={
              <button
                className="btn btn-primary btn-sm rounded-full px-3"
                onClick={() => navigate('/quotes')}
              >
                View All
              </button>
            }
          >
            <div className="space-y-2">
              {quotes.slice(0, 6).map((q) => (
                <div
                  key={q.id}
                  className="flex justify-between items-center p-3 rounded-xl bg-black/25 hover:bg-black/60 transition text-gray-200"
                >
                  <div
                    className="cursor-pointer"
                    onClick={() => navigate(`/quotes/${q.id}`)}
                  >
                    <div className="font-medium">{q.clientName}</div>
                    <div className="text-xs text-gray-400">
                      {String(q.status).replace(/_/g, ' ')}
                    </div>
                  </div>

                  <button
                    className="text-red-500 hover:text-red-300"
                    onClick={() => deleteQuote(q.id)}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* RIGHT SIDE */}
        <div className="space-y-6">

          {/* OVERVIEW */}
          <Card title="Overview">
            <div className="grid grid-cols-2 gap-3 text-center">
              {statusCards.map((s) => (
                <button
                  key={s.key}
                  className="p-3 rounded-2xl bg-black/35 hover:bg-black/70 border hover:border-[#e8d487] transition-all"
                  onClick={() => {
                    if (s.key === 'clients') navigate('/clients')
                    else if (s.key === 'quotes') navigate('/quotes')
                    else navigate(`/quotes?status=${s.key}`)
                  }}
                >
                  <div className="text-[11px] text-gray-400 uppercase">
                    {s.label}
                  </div>
                  <div className="text-xl font-bold text-[#f5f3da]">
                    {s.count}
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* REMINDERS */}
          <Card title="Reminders">
            <div className="text-gray-500 text-sm">
              No reminders yet.
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
