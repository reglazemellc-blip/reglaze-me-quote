/**
 * Universal sharing utility for quotes, invoices, contracts, and documents
 * Works on mobile (native share) and desktop (clipboard)
 */

type ShareDocumentOptions = {
  title: string
  message: string
  pdfUrl?: string // Optional: URL to PDF if available
}

/**
 * Share a document via native share (mobile) or clipboard (desktop)
 */
export async function shareDocument(options: ShareDocumentOptions): Promise<boolean> {
  const { title, message, pdfUrl } = options

  try {
    // Check if Web Share API is supported (mobile/tablets)
    if (navigator.share) {
      const shareData: ShareData = {
        title,
        text: message,
      }

      // Note: Can't attach PDF files directly via Web Share API
      // Users will need to download PDF separately if needed
      await navigator.share(shareData)
      return true
    } else {
      // Desktop fallback: Copy to clipboard
      await navigator.clipboard.writeText(message)
      return true
    }
  } catch (error: any) {
    // User cancelled share dialog
    if (error.name === 'AbortError') {
      throw new Error('CANCELLED')
    }
    throw error
  }
}

/**
 * Generate professional email text for a quote
 */
export function generateQuoteEmail(data: {
  clientName: string
  companyName: string
  quoteNumber: string
  total: number
  notes?: string
  phone?: string
  email?: string
}): string {
  const { clientName, companyName, quoteNumber, total, notes, phone, email } = data

  return `Hi ${clientName},

Here's your quote from ${companyName}:

Quote #: ${quoteNumber}
Total: $${total.toFixed(2)}

${notes ? `Notes: ${notes}\n\n` : ''}Thank you for your business!

${companyName}
${phone || ''}
${email || ''}`
}

/**
 * Generate professional email text for an invoice
 */
export function generateInvoiceEmail(data: {
  clientName: string
  companyName: string
  invoiceNumber: string
  total: number
  amountPaid: number
  balance: number
  dueDate?: string
  phone?: string
  email?: string
}): string {
  const { clientName, companyName, invoiceNumber, total, amountPaid, balance, dueDate, phone, email } = data

  return `Hi ${clientName},

Here's your invoice from ${companyName}:

Invoice #: ${invoiceNumber}
Total: $${total.toFixed(2)}
Amount Paid: $${amountPaid.toFixed(2)}
Balance Due: $${balance.toFixed(2)}
${dueDate ? `Due Date: ${dueDate}\n` : ''}
Thank you for your business!

${companyName}
${phone || ''}
${email || ''}`
}

/**
 * Generate professional email text for a contract
 */
export function generateContractEmail(data: {
  clientName: string
  companyName: string
  contractNumber: string
  totalAmount?: number
  startDate?: string
  phone?: string
  email?: string
}): string {
  const { clientName, companyName, contractNumber, totalAmount, startDate, phone, email } = data

  return `Hi ${clientName},

Here's your contract from ${companyName}:

Contract #: ${contractNumber}
${totalAmount ? `Total Amount: $${totalAmount.toFixed(2)}\n` : ''}${startDate ? `Start Date: ${startDate}\n` : ''}
Please review and contact us with any questions.

${companyName}
${phone || ''}
${email || ''}`
}

/**
 * Generate email text for sharing preparation/care documents
 */
export function generateDocumentEmail(data: {
  clientName: string
  companyName: string
  documentName: string
  message: string
  phone?: string
  email?: string
}): string {
  const { clientName, companyName, documentName, message, phone, email } = data

  return `Hi ${clientName},

${message}

Document: ${documentName}

If you have any questions, please don't hesitate to contact us.

${companyName}
${phone || ''}
${email || ''}`
}
