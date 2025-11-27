/**
 * Contracts List Page
 * Shows all contracts with filtering by status
 */

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useContractsStore } from '@store/useContractsStore'
import { useClientsStore } from '@store/useClientsStore'
import { useConfigStore } from '@store/useConfigStore'
import type { ContractStatus } from '@db/index'

export default function ContractsPage() {
  const { contracts, init, loading } = useContractsStore()
  const { clients, init: initClients } = useClientsStore()
  const { config } = useConfigStore()
  const navigate = useNavigate()

  const [filter, setFilter] = useState<ContractStatus | 'all'>('all')

  useEffect(() => {
    init()
    initClients()
  }, [init, initClients])

  const filtered = useMemo(() => {
    if (filter === 'all') return contracts
    return contracts.filter((c) => c.status === filter)
  }, [contracts, filter])

  const getClientName = (clientId: string) => {
    return clients.find((c) => c.id === clientId)?.name || 'Unknown Client'
  }

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString()
  }

  const statusColor = (status: ContractStatus) => {
    switch (status) {
      case 'signed': return 'text-green-400 border-green-400/60'
      case 'completed': return 'text-blue-400 border-blue-400/60'
      case 'sent': return 'text-yellow-400 border-yellow-400/60'
      case 'draft': return 'text-gray-400 border-gray-400/60'
      case 'canceled': return 'text-red-400 border-red-400/60'
      default: return 'text-gray-400 border-gray-400/60'
    }
  }

  const labels = config?.labels

  if (loading) {
    return <div className="p-6 text-center text-gray-400">Loading contracts...</div>
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-[#e8d487]">
            {labels?.contractsTitle || 'Contracts'}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage service contracts and agreements
          </p>
        </div>
        <button
          onClick={() => navigate('/contracts/new')}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {labels?.contractNewButton || 'New Contract'}
        </button>
      </div>

      {/* FILTERS */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'draft', 'sent', 'signed', 'completed', 'canceled'] as const).map((status) => (
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

      {/* CONTRACTS LIST */}
      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-gray-400">
          No contracts found
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((contract) => (
            <button
              key={contract.id}
              onClick={() => navigate(`/contracts/${contract.id}`)}
              className="
                w-full card p-4 flex justify-between items-center
                hover:bg-black/60 transition text-left
              "
            >
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-[#e8d487]">{contract.id}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor(contract.status)}`}>
                    {labels?.[`status${contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}` as keyof typeof labels] || contract.status}
                  </span>
                </div>
                <div className="text-sm text-gray-400">
                  {getClientName(contract.clientId)}
                </div>
                <div className="text-xs text-gray-500">
                  Created {formatDate(contract.createdAt)}
                </div>
              </div>

              <div className="text-right space-y-1">
                {contract.startDate && (
                  <div className="text-sm text-gray-400">
                    Start: {contract.startDate}
                  </div>
                )}
                {contract.totalAmount && (
                  <div className="text-lg font-semibold text-[#e8d487]">
                    ${contract.totalAmount.toFixed(2)}
                  </div>
                )}
                <div className="text-xs text-gray-500">
                  {contract.clientSignature && contract.contractorSignature ? '✓ Fully Signed' : 
                   contract.clientSignature || contract.contractorSignature ? '✓ Partially Signed' : 
                   'Unsigned'}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
