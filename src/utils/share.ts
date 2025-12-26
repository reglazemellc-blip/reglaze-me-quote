/**
 * Universal sharing utility for quotes, invoices, contracts, and documents
 * Works on mobile (native share) and desktop (email client + download)
 */

type ShareDocumentOptions = {
  title: string
  message: string
  pdfBlob?: Blob // Optional: PDF blob to share as file
  pdfFileName?: string // Required if pdfBlob provided
  clientEmail?: string // Optional: pre-fill recipient email
}

/**
 * Detect if we're on a true mobile device (not Windows with touch)
 */
function isMobileDevice(): boolean {
  const userAgent = navigator.userAgent.toLowerCase()
  return /android|iphone|ipad|ipod/.test(userAgent)
}

/**
 * Share a document via native share (mobile with PDF) or email client + download (desktop)
 */
export async function shareDocument(options: ShareDocumentOptions): Promise<boolean> {
  const { title, message, pdfBlob, pdfFileName, clientEmail } = options

  try {
    // Mobile: Use native share API
    if (isMobileDevice() && navigator.share) {
      // Try to share with file if supported
      if (pdfBlob && pdfFileName) {
        const file = new File([pdfBlob], pdfFileName, { type: 'application/pdf' })

        // Check if file sharing is supported
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title,
            text: message,
            files: [file],
          })
          return true
        }
      }

      // Fallback: Share text only if file sharing not supported
      await navigator.share({
        title,
        text: message,
      })
      return true
    }

    // Desktop: Download PDF + open Gmail compose
    if (pdfBlob && pdfFileName) {
      // Download the PDF
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = pdfFileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }

    // Open Gmail compose with pre-filled fields
    const subject = encodeURIComponent(title)
    const body = encodeURIComponent(message)
    const to = clientEmail ? encodeURIComponent(clientEmail) : ''

    // Use Gmail compose URL (works reliably in browser)
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}&body=${body}`
    window.open(gmailUrl, '_blank')

    return true
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

/**
 * Generate a simple text document as PDF blob
 */
export async function generateTextDocumentPDF(
  title: string,
  content: string,
  companyName: string
): Promise<Blob> {
  const { default: jsPDF } = await import('jspdf')
  const pdf = new jsPDF('p', 'pt', 'a4')

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 40
  const maxWidth = pageWidth - 2 * margin

  // Title
  pdf.setFontSize(18)
  pdf.setFont('helvetica', 'bold')
  pdf.text(title, margin, margin + 20)

  // Company name
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  pdf.text(companyName, margin, margin + 40)

  // Content
  pdf.setFontSize(11)
  pdf.setFont('helvetica', 'normal')

  const lines = pdf.splitTextToSize(content, maxWidth)
  let yPos = margin + 60

  for (const line of lines) {
    // Check if we need a new page
    if (yPos > pageHeight - margin) {
      pdf.addPage()
      yPos = margin
    }
    pdf.text(line, margin, yPos)
    yPos += 14 // Line height
  }

  return pdf.output('blob')
}
