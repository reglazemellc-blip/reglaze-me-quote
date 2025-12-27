/**
 * New Invoice Page
 * Create standalone invoices without requiring a quote
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useClientsStore } from '@store/useClientsStore'
import { useInvoicesStore } from '@store/useInvoicesStore'
import { useConfigStore } from '@store/useConfigStore'
import { useToastStore } from '@store/useToastStore'

export default function InvoiceNew() {
  const navigate = useNavigate()
  const { clients, init: initClients } = useClientsStore()
  const { upsertInvoice } = useInvoicesStore()
  const { config } = useConfigStore()
  const { show } = useToastStore()

  const [selectedClientId, setSelectedClientId] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [total, setTotal] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    initClients()
  }, [initClients])

  // Generate default invoice number
  useEffect(() => {
    if (!invoiceNumber) {
      const timestamp = Date.now().toString().slice(-6)
      setInvoiceNumber(`INV-${timestamp}`)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedClientId) {
      show('Please select a client')
      return
    }

    const totalAmount = parseFloat(total)
    if (isNaN(totalAmount) || totalAmount <= 0) {
      show('Please enter a valid invoice amount')
      return
    }

    setSaving(true)
    try {
      const invoice = await upsertInvoice({
        clientId: selectedClientId,
        invoiceNumber: invoiceNumber || `INV-${Date.now()}`,
        total: totalAmount,
        amountPaid: 0,
        status: 'unpaid',
        dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
        notes: notes || undefined,
      })

      show('Invoice created successfully')
      navigate(`/invoices/${invoice.id}`)
    } catch (error) {
      console.error('Error creating invoice:', error)
      show('Failed to create invoice')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      {/* HEADER */}
      <div>
        <button
          onClick={() => navigate('/invoices')}
          className="text-[#e8d487] hover:text-white transition flex items-center gap-2 mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Invoices
        </button>
        <h1 className="text-2xl font-semibold text-[#e8d487]">
          Create New Invoice
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Create a standalone invoice without a quote
        </p>
      </div>

      {/* FORM */}
      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        {/* Client Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Client *
          </label>
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="w-full bg-black/40 border border-[#2a2414] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#e8d487]"
            required
          >
            <option value="">Select a client...</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Don't see the client? <button type="button" onClick={() => navigate('/clients')} className="text-[#e8d487] hover:underline">Add them first</button>
          </p>
        </div>

        {/* Invoice Number */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Invoice Number *
          </label>
          <input
            type="text"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            className="w-full bg-black/40 border border-[#2a2414] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#e8d487]"
            placeholder="INV-123456"
            required
          />
        </div>

        {/* Total Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Total Amount *
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              className="w-full bg-black/40 border border-[#2a2414] rounded-lg pl-8 pr-4 py-3 text-white focus:outline-none focus:border-[#e8d487]"
              placeholder="0.00"
              required
            />
          </div>
        </div>

        {/* Due Date */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Due Date (Optional)
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full bg-black/40 border border-[#2a2414] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#e8d487]"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full bg-black/40 border border-[#2a2414] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#e8d487] resize-none"
            placeholder="Add any notes about this invoice..."
          />
        </div>

        {/* Submit Button */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/invoices')}
            className="flex-1 px-6 py-3 rounded-lg border border-[#2a2414] text-gray-300 hover:bg-black/40 transition"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 btn-gold"
            disabled={saving}
          >
            {saving ? 'Creating...' : 'Create Invoice'}
          </button>
        </div>
      </form>
    </div>
  )
}
