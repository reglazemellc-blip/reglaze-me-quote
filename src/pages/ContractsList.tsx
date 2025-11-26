// -------------------------------------------------------------
// ContractsList.tsx — Contracts List Page
// Displays all contracts with filters and status badges
// -------------------------------------------------------------

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useContractsStore } from '@store/useContractsStore';
import type { ContractStatus } from '@db/index';

// Status badge styling
const statusConfig: Record<ContractStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'border-gray-500/60 text-gray-300' },
  sent: { label: 'Sent', className: 'border-blue-500/60 text-blue-300' },
  client_signed: { label: 'Client Signed', className: 'border-yellow-500/60 text-yellow-300' },
  fully_signed: { label: 'Fully Signed', className: 'border-emerald-500/60 text-emerald-300' },
  canceled: { label: 'Canceled', className: 'border-red-500/60 text-red-300' },
};

export default function ContractsList() {
  const { contracts, loading, init } = useContractsStore();
  const navigate = useNavigate();

  const [filter, setFilter] = useState<ContractStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    init();
  }, [init]);

  // Filter contracts
  const filteredContracts = useMemo(() => {
    let list = [...contracts];

    if (filter !== 'all') {
      list = list.filter((c) => c.status === filter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.clientName?.toLowerCase().includes(q) ||
          c.contractNumber?.toLowerCase().includes(q) ||
          c.clientEmail?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [contracts, filter, searchQuery]);

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
        Loading contracts…
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-[#e8d487]">Contracts</h1>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search contracts..."
            className="input px-3 py-2 text-sm w-48"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <button
            onClick={() => navigate('/contracts/new')}
            className="btn-gold px-4 py-2 text-sm"
          >
            + New Contract
          </button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'draft', 'sent', 'client_signed', 'fully_signed'] as const).map((f) => (
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

      {/* CONTRACTS LIST */}
      {filteredContracts.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-gray-400 mb-4">No contracts found.</p>
          <p className="text-sm text-gray-500 mb-4">
            Create contracts from quotes or start a new one.
          </p>
          <button
            onClick={() => navigate('/quotes')}
            className="btn-outline-gold px-4 py-2"
          >
            View Quotes
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredContracts.map((contract) => (
            <Link
              key={contract.id}
              to={`/contracts/${contract.id}`}
              className="card block hover:border-[#e8d487]/40 transition p-4"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* LEFT SIDE */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[#e8d487] font-medium">
                      {contract.contractNumber || contract.id.slice(0, 8)}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] rounded-full border ${
                        statusConfig[contract.status]?.className ?? ''
                      }`}
                    >
                      {statusConfig[contract.status]?.label ?? contract.status}
                    </span>
                  </div>

                  <div className="text-sm text-gray-300">
                    {contract.clientName || 'Unknown Client'}
                  </div>

                  <div className="text-xs text-gray-500 mt-1">
                    Created: {formatDate(contract.createdAt)}
                    {contract.appointmentDate && (
                      <>
                        {' • '}
                        Appointment: {contract.appointmentDate}
                      </>
                    )}
                  </div>
                </div>

                {/* RIGHT SIDE - AMOUNT & SIGNATURES */}
                <div className="text-right">
                  <div className="text-lg font-semibold text-[#e8d487]">
                    {formatCurrency(contract.totalAmount)}
                  </div>
                  {contract.depositAmount && (
                    <div className="text-xs text-gray-400">
                      Deposit: {formatCurrency(contract.depositAmount)}
                    </div>
                  )}
                  <div className="flex gap-2 justify-end mt-1">
                    {contract.clientSignature && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded">
                        Client ✓
                      </span>
                    )}
                    {contract.contractorSignature && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                        Contractor ✓
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
