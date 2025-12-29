/**
 * Invoice Detail Page
 * Shows invoice details with payment tracking
 */

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileText } from 'lucide-react'
import { useClientsStore } from '@store/useClientsStore'
import { useQuotesStore } from '@store/useQuotesStore'
import { useConfigStore } from '@store/useConfigStore'
import { useInvoicesStore } from '@store/useInvoicesStore'


import { generateInvoicePDF, generateInvoicePDFBlob } from '@utils/pdf'
import { useToastStore } from '@store/useToastStore'
import { shareDocument, generateInvoiceEmail } from '@utils/share'

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  
 const { clients, init: initClients } = useClientsStore()
const { quotes, init: initQuotes } = useQuotesStore()
const { invoices, init: initInvoices, recordPayment } = useInvoicesStore()
const { config } = useConfigStore()




  const [paymentAmount, setPaymentAmount] = useState('')
  const [saving, setSaving] = useState(false)

  // Initialize stores
  useEffect(() => {
  initClients()
  initQuotes()
  initInvoices()
}, [initClients, initQuotes, initInvoices])



  const invoice = (invoices.find((i) => i.id === id) as any) || null

  const client = invoice ? clients.find((c) => c.id === invoice.clientId) : null
  const quote = invoice ? quotes.find((q) => q.id === invoice.quoteId) : null

  useEffect(() => {
    if (!invoice && id) {
      // Invoice not found, redirect back
      navigate('/invoices')
    }
  }, [invoice, id, navigate])

  if (!invoice) {
    return null
  }

  const balance = invoice.total - invoice.amountPaid

  const handleGeneratePDF = async () => {
    if (!invoice || !client || !config) {
      useToastStore.getState().show("Unable to generate PDF. Missing invoice or client data.")
      return
    }
    
    // Get quote data for items
    const relatedQuote = quote
    if (!relatedQuote) {
      useToastStore.getState().show("Unable to generate PDF. Invoice must be linked to a quote with line items.")
      return
    }
    
    try {
      // Create extended invoice object with quote items
      const invoiceWithItems = {
        ...invoice,
        items: relatedQuote.items || [],
        subtotal: relatedQuote.subtotal || 0,
        tax: relatedQuote.tax || 0,
        taxRate: relatedQuote.taxRate || 0,
        discount: relatedQuote.discount || 0,
        payments: [], // TODO: Add payment tracking to invoice type
        balance: invoice.total - invoice.amountPaid,
        // Propagate jobsite readiness acknowledgment to PDF generator
        jobsiteReadyAcknowledged: relatedQuote.jobsiteReadyAcknowledged,
        jobsiteReadyAcknowledgedAt: relatedQuote.jobsiteReadyAcknowledgedAt,
        // Propagate water shutoff election to PDF generator
        waterShutoffElected: relatedQuote.waterShutoffElected,
      }
      
      await generateInvoicePDF(invoiceWithItems as any, client, config.businessProfile)
    } catch (error) {
      console.error('Error generating PDF:', error)
      useToastStore.getState().show("Failed to generate PDF")
    }
  }

  const handleRecordPayment = async () => {
    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      useToastStore.getState().show("Please enter a valid payment amount")
      return
    }

    if (amount > balance) {
      const confirm = window.confirm(
        `Payment amount ($${amount.toFixed(2)}) exceeds balance ($${balance.toFixed(2)}). Continue?`
      )
      if (!confirm) return
    }

    setSaving(true)
    try {
      await recordPayment(invoice.id, amount)
      setPaymentAmount('')
      useToastStore.getState().show("Payment recorded successfully")
    } catch (error) {
      console.error('Error recording payment:', error)
      useToastStore.getState().show("Failed to record payment")
    } finally {
      setSaving(false)
    }
  }

  const handleShareInvoice = async () => {
    if (!invoice || !client || !config) {
      useToastStore.getState().show("Unable to share invoice. Missing invoice or client data.")
      return
    }

    // Get quote data for items
    const relatedQuote = quote
    if (!relatedQuote) {
      useToastStore.getState().show("Unable to share invoice. Invoice must be linked to a quote with line items.")
      return
    }

    try {
      // Generate PDF
      const invoiceWithItems = {
        ...invoice,
        items: relatedQuote.items || [],
        subtotal: relatedQuote.subtotal || 0,
        tax: relatedQuote.tax || 0,
        taxRate: relatedQuote.taxRate || 0,
        discount: relatedQuote.discount || 0,
        payments: [],
        balance: invoice.total - invoice.amountPaid,
      }

      const { blob, filename } = await generateInvoicePDFBlob(invoiceWithItems as any, client, config.businessProfile)

      // Generate email text
      const emailText = generateInvoiceEmail({
        clientName: client.name,
        companyName: config.businessProfile.companyName,
        invoiceNumber: invoice.invoiceNumber || invoice.id,
        total: invoice.total,
        amountPaid: invoice.amountPaid,
        balance: balance,
        dueDate: invoice.dueDate ? formatDate(invoice.dueDate) : undefined,
        phone: config.businessProfile.phone,
        email: config.businessProfile.email,
      })

      await shareDocument({
        title: `Invoice from ${config.businessProfile.companyName}`,
        message: emailText,
        pdfBlob: blob,
        pdfFileName: filename,
        clientEmail: client.email || '',
      })

      useToastStore.getState().show("PDF downloaded! Attach it to the email.")
    } catch (error: any) {
      if (error.message === 'CANCELLED') return
      console.error('Error sharing invoice:', error)
      useToastStore.getState().show("Failed to share invoice")
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString()
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'text-green-400 border-green-400/60'
      case 'partial': return 'text-yellow-400 border-yellow-400/60'
      case 'unpaid': return 'text-red-400 border-red-400/60'
      case 'refunded': return 'text-gray-400 border-gray-400/60'
      default: return 'text-gray-400 border-gray-400/60'
    }
  }

  const labels = config?.labels

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      
      {/* HEADER */}
      <div className="flex justify-between items-start">
        <div>
          <button
            onClick={() => navigate('/invoices')}
            className="text-[#e8d487] hover:text-white transition flex items-center gap-2 mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Invoices
          </button>
          <h1 className="text-2xl font-semibold text-[#e8d487]">{invoice.invoiceNumber || invoice.id}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`text-sm px-3 py-1 rounded-full border ${statusColor(invoice.status)}`}>
              {labels?.[`status${invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}` as keyof typeof labels] || invoice.status}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleShareInvoice}
            className="btn-primary px-4 py-1 text-sm"
          >
            Share Invoice
          </button>
          <button
            onClick={handleGeneratePDF}
            className="btn-secondary flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Generate PDF
          </button>
          {quote && (
            <button
              onClick={() => navigate(`/quotes/${quote.id}`)}
              className="btn-secondary flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              View Quote
            </button>
          )}
          <button
    onClick={async () => {
      if (!window.confirm("Delete this invoice permanently?")) return;
      await useInvoicesStore.getState().remove(invoice.id);
      useToastStore.getState().show("Invoice deleted");
      navigate("/invoices");
    }}
    className="btn-danger flex items-center gap-2"
  >
    Delete
  </button>
</div>

      </div>

      {/* CLIENT INFO */}
      <div className="card p-6 space-y-2">
        <div className="text-[11px] tracking-wide text-gray-500 uppercase">
          Client
        </div>
        <div className="text-lg font-semibold text-[#f5f3da]">
          {client?.name}
        </div>
        {client && (
          <div className="text-sm text-gray-300 space-y-0.5">
            {client.phone && <p>{client.phone}</p>}
            {client.address && (
              <p className="whitespace-pre-line">{client.address}</p>
            )}
            {client.email && <p className="text-gray-400">{client.email}</p>}
          </div>
        )}
      </div>

      {/* FINANCIAL SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="text-xs text-gray-500 mb-1">Total Amount</div>
          <div className="text-2xl font-semibold text-[#e8d487]">
            {formatCurrency(invoice.total)}
          </div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-gray-500 mb-1">Amount Paid</div>
          <div className="text-2xl font-semibold text-green-400">
            {formatCurrency(invoice.amountPaid)}
          </div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-gray-500 mb-1">Balance Due</div>
          <div className={`text-2xl font-semibold ${balance > 0 ? 'text-red-400' : 'text-gray-400'}`}>
            {formatCurrency(balance)}
          </div>
        </div>
      </div>

      {/* PAYMENT FORM */}
      {balance > 0 && (
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[#e8d487]">
            {labels?.invoiceRecordPayment || 'Record Payment'}
          </h2>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-2">
                Payment Amount
              </label>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="input-field"
                disabled={saving}
              />
            </div>
            <button
              onClick={handleRecordPayment}
              disabled={saving || !paymentAmount}
              className="btn-primary px-6"
            >
              {saving ? 'Saving...' : labels?.invoiceRecordPaymentButton || 'Record Payment'}
            </button>
          </div>
        </div>
      )}

      {/* QUOTE DETAILS */}
      {quote && (
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[#e8d487]">
            {labels?.invoiceQuoteDetails || 'Quote Details'}
          </h2>
          
          {quote.items && quote.items.length > 0 && (
            <div>
              <div className="text-sm text-gray-500 mb-2">Line Items</div>
              <div className="space-y-2">
                {quote.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-gray-300">{item.description}</span>
                    <span className="text-[#e8d487]">{formatCurrency(item.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {quote.services && quote.services.length > 0 && (
            <div>
              <div className="text-sm text-gray-500 mb-2">Services</div>
              <div className="space-y-1">
                {quote.services.map((service, idx) => (
                  <div key={idx} className="text-sm text-gray-300">
                    • {service}
                  </div>
                ))}
              </div>
            </div>
          )}

          {quote.notes && (
            <div>
              <div className="text-sm text-gray-500 mb-2">Notes</div>
              <p className="text-sm text-gray-300">{quote.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* INVOICE METADATA */}
      <div className="card p-6 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Created</span>
          <span className="text-gray-300">{formatDate(invoice.createdAt)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Last Updated</span>
          <span className="text-gray-300">{formatDate(invoice.updatedAt)}</span>
        </div>
        {invoice.notes && (
          <div className="pt-3 border-t border-gray-800">
            <div className="text-gray-500 mb-1">Invoice Notes</div>
            <p className="text-gray-300">{invoice.notes}</p>
          </div>
        )}
      </div>

    </div>
  )
}
