// -------------------------------------------------------------
// InvoicesList.tsx — Invoice List Page
// Displays all invoices with filters and status badges
// -------------------------------------------------------------

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useInvoicesStore } from '@store/useInvoicesStore';
import type { InvoiceStatus } from '@db/index';

// Status badge styling
const statusConfig: Record<InvoiceStatus, { label: string; className: string }> = {
  unpaid: { label: 'Unpaid', className: 'border-yellow-500/60 text-yellow-300' },
  partial: { label: 'Partial', className: 'border-blue-500/60 text-blue-300' },
  paid: { label: 'Paid', className: 'border-emerald-500/60 text-emerald-300' },
  overdue: { label: 'Overdue', className: 'border-red-500/60 text-red-300' },
  refunded: { label: 'Refunded', className: 'border-gray-500/60 text-gray-300' },
};

export default function InvoicesList() {
  const { invoices, loading, init } = useInvoicesStore();
  const navigate = useNavigate();

  const [filter, setFilter] = useState<InvoiceStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    init();
  }, [init]);

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    let list = [...invoices];

    if (filter !== 'all') {
      list = list.filter((inv) => inv.status === filter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (inv) =>
          inv.clientName?.toLowerCase().includes(q) ||
          inv.invoiceNumber?.toLowerCase().includes(q) ||
          inv.clientEmail?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [invoices, filter, searchQuery]);

  // Format helpers
  const formatCurrency = (value: number | undefined) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value ?? 0);
  };

  const formatDate = (ts: number | undefined) => {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-400">
        Loading invoices…
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-[#e8d487]">Invoices</h1>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search invoices..."
            className="input px-3 py-2 text-sm w-48"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <button
            onClick={() => navigate('/invoices/new')}
            className="btn-gold px-4 py-2 text-sm"
          >
            + New Invoice
          </button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'unpaid', 'partial', 'paid', 'overdue'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs border transition ${
              filter === f
                ? 'border-[#e8d487] text-[#e8d487] bg-black/60'
                : 'border-[#2a2414] text-gray-400 hover:border-[#e8d487]/60'
            }`}
          >
            {f === 'all' ? 'All' : statusConfig[f].label}
          </button>
        ))}
      </div>

      {/* INVOICES LIST */}
      {filteredInvoices.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-gray-400 mb-4">No invoices found.</p>
          <button
            onClick={() => navigate('/invoices/new')}
            className="btn-outline-gold px-4 py-2"
          >
            Create Your First Invoice
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInvoices.map((invoice) => (
            <Link
              key={invoice.id}
              to={`/invoices/${invoice.id}`}
              className="card block hover:border-[#e8d487]/40 transition p-4"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* LEFT SIDE */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[#e8d487] font-medium">
                      {invoice.invoiceNumber || invoice.id.slice(0, 8)}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] rounded-full border ${
                        statusConfig[invoice.status]?.className ?? ''
                      }`}
                    >
                      {statusConfig[invoice.status]?.label ?? invoice.status}
                    </span>
                  </div>

                  <div className="text-sm text-gray-300">
                    {invoice.clientName || 'Unknown Client'}
                  </div>

                  <div className="text-xs text-gray-500 mt-1">
                    Created: {formatDate(invoice.createdAt)}
                    {invoice.dueDate && (
                      <>
                        {' • '}
                        Due: {formatDate(invoice.dueDate)}
                      </>
                    )}
                  </div>
                </div>

                {/* RIGHT SIDE - AMOUNTS */}
                <div className="text-right">
                  <div className="text-lg font-semibold text-[#e8d487]">
                    {formatCurrency(invoice.total)}
                  </div>
                  <div className="text-xs text-gray-400">
                    Paid: {formatCurrency(invoice.amountPaid)}
                  </div>
                  {invoice.amountPaid > 0 && invoice.amountPaid < invoice.total && (
                    <div className="text-xs text-yellow-400">
                      Balance: {formatCurrency(invoice.total - invoice.amountPaid)}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
