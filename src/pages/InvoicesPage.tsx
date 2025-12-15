/**
 * Invoices List Page
 * Shows all invoices with filtering by status
 */

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInvoicesStore } from '@store/useInvoicesStore'
import { useClientsStore } from '@store/useClientsStore'
import { useConfigStore } from '@store/useConfigStore'
import type { InvoiceStatus } from '@db/index'

export default function InvoicesPage() {
  const { invoices, init, loading } = useInvoicesStore()
  const { clients, init: initClients } = useClientsStore()

  const { config } = useConfigStore()
  const navigate = useNavigate()

  const [filter, setFilter] = useState<InvoiceStatus | 'all'>('all')

  useEffect(() => {
  init()
  initClients()
}, [init, initClients])


    const filtered = useMemo(() => {
    const list =
      filter === 'all'
        ? invoices
        : invoices.filter((i) => i.status === filter)

    // Surface outstanding payments first
    return [...list].sort((a, b) => {
      const aOutstanding = a.status === 'unpaid' || a.status === 'partial'
      const bOutstanding = b.status === 'unpaid' || b.status === 'partial'
      if (aOutstanding === bOutstanding) return 0
      return aOutstanding ? -1 : 1
    })
  }, [invoices, filter])


  const getClientName = (clientId: string) => {
    return clients.find((c) => c.id === clientId)?.name || 'Unknown Client'
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

    const outstandingTotal = useMemo(() => {
    return invoices
      .filter((i) => i.status === 'unpaid' || i.status === 'partial')
      .reduce((sum, i) => sum + Math.max(0, i.total - i.amountPaid), 0)
  }, [invoices])


  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString()
  }

  const statusColor = (status: InvoiceStatus) => {
    switch (status) {
      case 'paid': return 'text-green-400 border-green-400/60'
      case 'partial': return 'text-yellow-400 border-yellow-400/60'
      case 'unpaid': return 'text-red-400 border-red-400/60'
      case 'refunded': return 'text-gray-400 border-gray-400/60'
      default: return 'text-gray-400 border-gray-400/60'
    }
  }

  const labels = config?.labels

  if (loading) {
    return <div className="p-6 text-center text-gray-400">Loading invoices...</div>
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-[#e8d487]">
            {labels?.invoicesTitle || 'Invoices'}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage invoices and track payments
          </p>
        </div>
      </div>

            {outstandingTotal > 0 && (
        <div className="card p-4 flex justify-between items-center">
          <div className="text-sm text-gray-400">
            Outstanding balance
          </div>
          <div className="text-xl font-semibold text-red-400">
            {formatCurrency(outstandingTotal)}
          </div>
        </div>
      )}


      {/* FILTERS */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'unpaid', 'partial', 'paid', 'refunded'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`
              px-3 py-1 rounded-lg text-sm transition
              ${filter === status
                ? 'bg-[#e8d487] text-black font-medium'
                : 'text-[#e8d487] border border-[#2a2414] hover:bg-[#2a2414]'
              }
            `}
          >
            {status === 'all' ? 'All' : labels?.[`status${status.charAt(0).toUpperCase() + status.slice(1)}` as keyof typeof labels] || status}
          </button>
        ))}
      </div>

      {/* INVOICES LIST */}
      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-gray-400">
          No invoices found
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((invoice) => (
            <button
              key={invoice.id}
              onClick={() => navigate(`/invoices/${invoice.id}`)}
              className="
                w-full card p-4 flex justify-between items-center
                hover:bg-black/60 transition text-left
              "
            >
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-[#e8d487]">
                   {invoice.invoiceNumber ?? invoice.id}
                </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor(invoice.status)}`}>
                    {labels?.[`status${invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}` as keyof typeof labels] || invoice.status}
                  </span>
                </div>
                <div className="text-sm text-gray-400">
                  {getClientName(invoice.clientId)}
                </div>
                <div className="text-xs text-gray-500">
                  Created {formatDate(invoice.createdAt)}
                </div>
              </div>

              <div className="text-right space-y-1">
                <div className="text-lg font-semibold text-[#e8d487]">
                  {formatCurrency(invoice.total)}
                </div>
                {invoice.amountPaid > 0 && (
                  <div className="text-xs text-gray-400">
                    Paid: {formatCurrency(invoice.amountPaid)}
                  </div>
                )}
                {invoice.total - invoice.amountPaid > 0 && (
                  <div className="text-xs text-red-400">
                    Due: {formatCurrency(invoice.total - invoice.amountPaid)}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
