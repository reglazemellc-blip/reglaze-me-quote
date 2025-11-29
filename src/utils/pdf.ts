import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import type { Quote, Client, Invoice, Contract } from '../db'
import type { BusinessProfile } from '../config/businessProfile'

// PDF Layout Version 5.1 - Fixed Width Text Constraint - Nov 27 2025 1:45pm
const COLORS = {
  gold: [232, 212, 135] as [number, number, number],
  darkGold: [180, 150, 80] as [number, number, number],
  black: [42, 42, 42] as [number, number, number],
  darkGray: [60, 60, 60] as [number, number, number],
  mediumGray: [100, 100, 100] as [number, number, number],
  lightGray: [160, 160, 160] as [number, number, number],
  veryLightGray: [245, 245, 245] as [number, number, number],
  cream: [252, 250, 242] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  border: [220, 220, 220] as [number, number, number],
}

const FONTS = {
  title: 28,
  heading: 14,
  subheading: 11,
  body: 10,
  small: 8,
}

// Helper function to convert logo URL to base64
async function loadLogoAsBase64(logoUrl: string): Promise<{ data: string; format: string } | null> {
  if (logoUrl.startsWith('data:image/')) {
    let format = 'PNG'
    if (logoUrl.includes('image/jpeg') || logoUrl.includes('image/jpg')) {
      format = 'JPEG'
    }
    return { data: logoUrl, format }
  }
  
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = function() {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth || img.width
        canvas.height = img.naturalHeight || img.height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(null)
          return
        }
        ctx.drawImage(img, 0, 0)
        const dataUrl = canvas.toDataURL('image/png')
        resolve({ data: dataUrl, format: 'PNG' })
      } catch (err) {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = logoUrl
    setTimeout(() => {
      if (!img.complete) resolve(null)
    }, 10000)
  })
}

// Helper to add page header
function addHeader(
  pdf: jsPDF,
  businessProfile: BusinessProfile,
  title: string,
  logoBase64?: { data: string; format: string } | null
) {
  const pageWidth = pdf.internal.pageSize.getWidth()
  const margin = 40
  let yPos = 20
  
  // Logo on left
  if (logoBase64 && logoBase64.data) {
    try {
      pdf.addImage(logoBase64.data, logoBase64.format, margin, yPos, 60, 60)
    } catch (err) {
      console.error('Error adding logo:', err)
    }
  }
  
  // Company name next to logo - vertically centered with logo
  const infoX = margin + 75
  let infoY = yPos + 32
  
  pdf.setFontSize(20)
  pdf.setTextColor(...COLORS.black)
  pdf.setFont('helvetica', 'bold')
  pdf.text(businessProfile.companyName, infoX, infoY)
  
  if (businessProfile.tagline) {
    infoY += 14
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'italic')
    pdf.setTextColor(...COLORS.darkGold)
    pdf.text(businessProfile.tagline, infoX, infoY)
  }
  
  // Document title on right - centered
  const rightX = pageWidth - margin
  pdf.setFontSize(36)
  pdf.setTextColor(...COLORS.black)
  pdf.setFont('helvetica', 'bold')
  pdf.text(title, rightX, yPos + 20, { align: 'right' })
  
  // Gold accent line under title
  pdf.setDrawColor(...COLORS.gold)
  pdf.setLineWidth(3)
  pdf.line(rightX - 120, yPos + 27, rightX, yPos + 27)
  
  // Company contact info under the title on the right - centered alignment
  let contactY = yPos + 42
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(...COLORS.darkGray)
  pdf.text(`${businessProfile.addressLine1}, ${businessProfile.city}, ${businessProfile.state} ${businessProfile.zip}`, rightX, contactY, { align: 'right' })
  contactY += 10
  pdf.text(businessProfile.phone, rightX, contactY, { align: 'right' })
  contactY += 10
  pdf.text(businessProfile.email, rightX, contactY, { align: 'right' })
  
  // Separator line
  const separatorY = yPos + 75
  pdf.setDrawColor(...COLORS.border)
  pdf.setLineWidth(0.5)
  pdf.line(margin, separatorY, pageWidth - margin, separatorY)
  
  return separatorY + 20
}

// Helper to add footer
function addFooter(pdf: jsPDF, businessProfile: BusinessProfile) {
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const footerY = pageHeight - 30
  
  pdf.setFontSize(FONTS.small)
  pdf.setTextColor(...COLORS.lightGray)
  pdf.setFont('helvetica', 'italic')
  
  const footerText = businessProfile.website || businessProfile.companyName
  pdf.text(footerText, pageWidth / 2, footerY, { align: 'center' })
}

export async function exportElementToPDF(el: HTMLElement, fileName: string) {
  const canvas = await html2canvas(el, { scale: 2, useCORS: true })
  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF('p', 'pt', 'a4')
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const imgWidth = pageWidth
  const imgHeight = canvas.height * (imgWidth / canvas.width)
  let y = 0
  while (y < imgHeight) {
    if (y > 0) pdf.addPage()
    pdf.addImage(imgData, 'PNG', 0, -y, imgWidth, imgHeight)
    y += pageHeight
  }
  pdf.save(fileName)
}

export async function generateQuotePDF(quote: Quote, client: Client, businessProfile: BusinessProfile) {
  // Load logo
  let logoData: { data: string; format: string } | null = null
  if (businessProfile.logo && businessProfile.logo.trim()) {
    logoData = await loadLogoAsBase64(businessProfile.logo)
  }
  
  const pdf = new jsPDF('p', 'pt', 'a4')
  const pageWidth = pdf.internal.pageSize.getWidth()
  const margin = 40
  let yPos = addHeader(pdf, businessProfile, 'QUOTE', logoData)
  
  // Info boxes
  const boxGap = 12
  const boxWidth = (pageWidth - (2 * margin) - boxGap) / 2
  const boxHeight = 100
  
  const drawInfoBox = (x: number, y: number, width: number, height: number, headerText: string) => {
    pdf.setFillColor(...COLORS.gold)
    pdf.rect(x, y, width, 20, 'F')
    pdf.setFillColor(...COLORS.cream)
    pdf.rect(x, y + 20, width, height - 20, 'F')
    pdf.setDrawColor(...COLORS.darkGold)
    pdf.setLineWidth(1)
    pdf.rect(x, y, width, height, 'S')
    pdf.setFontSize(9)
    pdf.setTextColor(...COLORS.black)
    pdf.setFont('helvetica', 'bold')
    pdf.text(headerText, x + 10, y + 13)
  }
  
  // Bill To box
  drawInfoBox(margin, yPos, boxWidth, boxHeight, 'BILL TO')
  let contentY = yPos + 35
  pdf.setFontSize(10)
  pdf.setTextColor(...COLORS.black)
  pdf.setFont('helvetica', 'bold')
  pdf.text(client.name || 'N/A', margin + 12, contentY)
  contentY += 12
  
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(...COLORS.darkGray)
  if (client.address) {
    const addressLines = pdf.splitTextToSize(client.address, boxWidth - 24)
    addressLines.forEach((line: string, i: number) => {
      if (i < 2) {
        pdf.text(line, margin + 12, contentY)
        contentY += 10
      }
    })
  }
  if (client.phone) {
    pdf.text(client.phone, margin + 12, contentY)
    contentY += 10
  }
  if (client.email) {
    pdf.text(client.email, margin + 12, contentY)
    contentY += 10
  }
  
  // Quote Details box
  const rightBoxX = margin + boxWidth + boxGap
  drawInfoBox(rightBoxX, yPos, boxWidth, boxHeight, 'QUOTE DETAILS')
  
  contentY = yPos + 35
  pdf.setFontSize(8)
  pdf.setTextColor(...COLORS.darkGray)
  
  const displayId = quote.quoteNumber || quote.id || 'N/A'
  const quoteDate = new Date(quote.createdAt || Date.now()).toLocaleDateString()
  const validUntil = new Date(quote.createdAt || Date.now())
  validUntil.setDate(validUntil.getDate() + 30)
  
  const labelX = rightBoxX + 12
  const valueX = rightBoxX + boxWidth - 12
  
  pdf.setFont('helvetica', 'bold')
  pdf.text('Quote #:', labelX, contentY)
  pdf.setFont('helvetica', 'normal')
  pdf.text(displayId, valueX, contentY, { align: 'right' })
  contentY += 11
  
  pdf.setFont('helvetica', 'bold')
  pdf.text('Date:', labelX, contentY)
  pdf.setFont('helvetica', 'normal')
  pdf.text(quoteDate, valueX, contentY, { align: 'right' })
  contentY += 11
  
  pdf.setFont('helvetica', 'bold')
  pdf.text('Payment:', labelX, contentY)
  pdf.setFont('helvetica', 'normal')
  pdf.text('Due on completion', valueX, contentY, { align: 'right' })
  
  yPos += boxHeight + 20
  
  // Services table
  pdf.setFillColor(...COLORS.gold)
  pdf.rect(margin, yPos, pageWidth - (2 * margin), 22, 'F')
  pdf.setDrawColor(...COLORS.black)
  pdf.setLineWidth(1)
  pdf.line(margin, yPos, pageWidth - margin, yPos)
  pdf.line(margin, yPos + 22, pageWidth - margin, yPos + 22)
  pdf.setFontSize(FONTS.subheading)
  pdf.setTextColor(...COLORS.black)
  pdf.setFont('helvetica', 'bold')
  pdf.text('SERVICES', margin + 12, yPos + 15)
  yPos += 22
  
  const tableStartX = margin
  const tableWidth = pageWidth - (2 * margin)
  pdf.setFillColor(...COLORS.veryLightGray)
  pdf.rect(tableStartX, yPos, tableWidth, 20, 'F')
  
  const descColX = tableStartX + 12
  const qtyColX = pageWidth - 280
  const priceColX = pageWidth - 180
  const totalColX = pageWidth - margin - 12
  
  pdf.setFontSize(9)
  pdf.setTextColor(...COLORS.darkGray)
  pdf.setFont('helvetica', 'bold')
  pdf.text('DESCRIPTION', descColX, yPos + 13)
  pdf.text('QTY', qtyColX, yPos + 13)
  pdf.text('PRICE', priceColX, yPos + 13)
  pdf.text('TOTAL', totalColX, yPos + 13, { align: 'right' })
  
  pdf.setDrawColor(...COLORS.border)
  pdf.setLineWidth(0.5)
  pdf.line(tableStartX, yPos + 20, tableStartX + tableWidth, yPos + 20)
  yPos += 20
  
  // Table rows
  if (quote.items && Array.isArray(quote.items)) {
    quote.items.forEach((item: any, index: number) => {
      const quantity = item.qty || 0
      const price = item.unitPrice || 0
      const total = item.total || (quantity * price)
      
      let tempY = yPos + 14
      if (item.serviceDescription?.trim()) {
        const maxWidth = 200
        tempY += Math.ceil(pdf.splitTextToSize(item.serviceDescription, maxWidth).length) * 9
      }
      if (item.warning?.trim()) {
        const maxWidth = 200
        tempY += Math.ceil(pdf.splitTextToSize(item.warning, maxWidth).length) * 9
      }
      const rowHeight = Math.max(tempY - yPos + 10, 35)
      
      if (index % 2 === 1) {
        pdf.setFillColor(...COLORS.cream)
        pdf.rect(tableStartX, yPos, tableWidth, rowHeight, 'F')
      }
      
      pdf.setDrawColor(...COLORS.border)
      pdf.setLineWidth(0.3)
      pdf.line(tableStartX, yPos + rowHeight, tableStartX + tableWidth, yPos + rowHeight)
      
      let contentY = yPos + 14
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(10)
      pdf.setTextColor(...COLORS.black)
      pdf.text(item.description || 'Service', descColX, contentY)
      
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(9)
      pdf.text(quantity.toString(), qtyColX + 10, contentY)
      pdf.text(`${businessProfile.currencySymbol}${price.toFixed(2)}`, priceColX, contentY)
      pdf.setFont('helvetica', 'bold')
      pdf.text(`${businessProfile.currencySymbol}${total.toFixed(2)}`, totalColX, contentY, { align: 'right' })
      contentY += 12
      
      if (item.serviceDescription?.trim()) {
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(9)
        pdf.setTextColor(...COLORS.mediumGray)
        const maxWidth = 200
        const descLines = pdf.splitTextToSize(item.serviceDescription, maxWidth)
        descLines.forEach((line: string) => {
          pdf.text(line, descColX + 5, contentY)
          contentY += 10
        })
      }
      
      if (item.warning?.trim()) {
        pdf.setFont('helvetica', 'italic')
        pdf.setFontSize(9)
        pdf.setTextColor(200, 100, 0)
        const maxWidth = 200
        const warnLines = pdf.splitTextToSize(`⚠ ${item.warning}`, maxWidth)
        warnLines.forEach((line: string) => {
          pdf.text(line, descColX + 5, contentY)
          contentY += 10
        })
      }
      
      yPos += rowHeight
    })
  }
  
  pdf.setDrawColor(...COLORS.gold)
  pdf.setLineWidth(2)
  pdf.line(tableStartX, yPos, tableStartX + tableWidth, yPos)
  yPos += 25
  
  // Totals
  const totalsX = pageWidth - margin - 200
  pdf.setFontSize(FONTS.body)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(...COLORS.darkGray)
  
  pdf.text('Subtotal:', totalsX, yPos)
  pdf.text(`${businessProfile.currencySymbol}${quote.subtotal.toFixed(2)}`, pageWidth - margin - 12, yPos, { align: 'right' })
  yPos += 12
  
  if (quote.tax > 0) {
    pdf.text(`Tax (${(quote.taxRate * 100).toFixed(1)}%):`, totalsX, yPos)
    pdf.text(`${businessProfile.currencySymbol}${quote.tax.toFixed(2)}`, pageWidth - margin - 12, yPos, { align: 'right' })
    yPos += 12
  }
  
  if (quote.discount > 0) {
    pdf.setTextColor(200, 0, 0)
    pdf.text('Discount:', totalsX, yPos)
    pdf.text(`-${businessProfile.currencySymbol}${quote.discount.toFixed(2)}`, pageWidth - margin - 12, yPos, { align: 'right' })
    yPos += 12
  }
  
  yPos += 5
  pdf.setFillColor(...COLORS.gold)
  pdf.rect(totalsX - 10, yPos - 10, 210, 28, 'F')
  pdf.setDrawColor(...COLORS.black)
  pdf.setLineWidth(1.5)
  pdf.rect(totalsX - 10, yPos - 10, 210, 28, 'S')
  
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(FONTS.heading)
  pdf.setTextColor(...COLORS.black)
  pdf.text('TOTAL:', totalsX, yPos + 8)
  pdf.setFontSize(16)
  pdf.text(`${businessProfile.currencySymbol}${quote.total.toFixed(2)}`, pageWidth - margin - 12, yPos + 8, { align: 'right' })
  
  yPos += 48
  
  
  if (quote.notes) {
    pdf.setFillColor(...COLORS.gold)
    pdf.rect(margin, yPos, pageWidth - (2 * margin), 18, 'F')
    pdf.setFontSize(9)
    pdf.setTextColor(...COLORS.black)
    pdf.setFont('helvetica', 'bold')
    pdf.text('TERMS & CONDITIONS', margin + 10, yPos + 12)
    yPos += 30
    
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.setTextColor(...COLORS.mediumGray)
    const splitNotes = pdf.splitTextToSize(quote.notes, pageWidth - (2 * margin) - 20)
    splitNotes.forEach((line: string) => {
      pdf.text(line, margin + 10, yPos)
      yPos += 12
    })
    yPos += 10
  }
  
  // Jobsite Readiness Acknowledgment
  if ((quote as any).jobsiteReadyAcknowledged && (quote as any).jobsiteReadyAcknowledgedAt) {
    pdf.setFillColor(...COLORS.gold)
    pdf.rect(margin, yPos, pageWidth - (2 * margin), 18, 'F')
    pdf.setFontSize(9)
    pdf.setTextColor(...COLORS.black)
    pdf.setFont('helvetica', 'bold')
    pdf.text('JOBSITE READINESS', margin + 10, yPos + 12)
    yPos += 30
    
    // Plumbing requirement explanatory text
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.setTextColor(...COLORS.mediumGray)
    pdf.text('All plumbing fixtures must be operational before refinishing begins.', margin + 10, yPos)
    yPos += 12
    pdf.text('Faucets must shut off completely and drains must function properly.', margin + 10, yPos)
    yPos += 12
    pdf.text('If plumbing or jobsite conditions prevent work from starting or finishing as scheduled, additional fees may apply.', margin + 10, yPos)
    yPos += 16

    // Acknowledgment lines
    pdf.text('Jobsite Readiness & Plumbing Condition Acknowledged', margin + 10, yPos)
    yPos += 14
    
    const acknowledgedDate = new Date((quote as any).jobsiteReadyAcknowledgedAt).toLocaleString()
    pdf.setFontSize(9)
    pdf.text(`Acknowledged on: ${acknowledgedDate}`, margin + 10, yPos)
    yPos += 16
    
    // Water shutoff warranty void notice
    if ((quote as any).waterShutoffElected) {
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)
      pdf.setTextColor(200, 50, 50) // Red color for warranty void
      pdf.text('Warranty voided due to customer-elected water shutoff.', margin + 10, yPos)
      yPos += 10
    }
  }
  
  addFooter(pdf, businessProfile)
  pdf.save(`Quote_${displayId}_${(client.name || 'Client').replace(/\s+/g, '_')}.pdf`)
}

export async function generateInvoicePDF(invoice: Invoice & { items?: any[]; subtotal?: number; tax?: number; discount?: number; payments?: any[]; balance?: number }, client: Client, businessProfile: BusinessProfile) {
  let logoData: { data: string; format: string } | null = null
  if (businessProfile.logo && businessProfile.logo.trim()) {
    logoData = await loadLogoAsBase64(businessProfile.logo)
  }
  
  const pdf = new jsPDF('p', 'pt', 'a4')
  const pageWidth = pdf.internal.pageSize.getWidth()
  const margin = 40
  let yPos = addHeader(pdf, businessProfile, 'INVOICE', logoData)
  
  // Similar structure to quote PDF...
  const boxGap = 12
  const boxWidth = (pageWidth - (2 * margin) - boxGap) / 2
  const boxHeight = 100
  
  const drawInfoBox = (x: number, y: number, width: number, height: number, headerText: string) => {
    pdf.setFillColor(...COLORS.gold)
    pdf.rect(x, y, width, 20, 'F')
    pdf.setFillColor(...COLORS.cream)
    pdf.rect(x, y + 20, width, height - 20, 'F')
    pdf.setDrawColor(...COLORS.darkGold)
    pdf.setLineWidth(1)
    pdf.rect(x, y, width, height, 'S')
    pdf.setFontSize(9)
    pdf.setTextColor(...COLORS.black)
    pdf.setFont('helvetica', 'bold')
    pdf.text(headerText, x + 10, y + 13)
  }
  
  drawInfoBox(margin, yPos, boxWidth, boxHeight, 'INVOICE INFO')
  let contentY = yPos + 35
  pdf.setFontSize(8)
  pdf.setTextColor(...COLORS.darkGray)
  
  const labelX = margin + 12
  const valueX = margin + boxWidth - 12
  
  const displayInvoiceNumber = invoice.invoiceNumber || invoice.id || 'N/A'
  
  pdf.setFont('helvetica', 'bold')
  pdf.text('Invoice #:', labelX, contentY)
  pdf.setFont('helvetica', 'normal')
  pdf.text(displayInvoiceNumber, valueX, contentY, { align: 'right' })
  contentY += 11
  
  pdf.setFont('helvetica', 'bold')
  pdf.text('Date:', labelX, contentY)
  pdf.setFont('helvetica', 'normal')
  pdf.text(new Date(invoice.createdAt || Date.now()).toLocaleDateString(), valueX, contentY, { align: 'right' })
  contentY += 11
  
  pdf.setFont('helvetica', 'bold')
  pdf.text('Status:', labelX, contentY)
  pdf.setFont('helvetica', 'bold')
  const statusColors: Record<string, [number, number, number]> = { 
    unpaid: [200, 0, 0], 
    partial: [255, 165, 0], 
    paid: [0, 150, 0] 
  }
  const color = statusColors[invoice.status] || COLORS.black
  pdf.setTextColor(...color)
  pdf.text(invoice.status.toUpperCase(), valueX, contentY, { align: 'right' })
  
  const rightBoxX = margin + boxWidth + boxGap
  drawInfoBox(rightBoxX, yPos, boxWidth, boxHeight, 'BILL TO')
  contentY = yPos + 35
  pdf.setFontSize(10)
  pdf.setTextColor(...COLORS.black)
  pdf.setFont('helvetica', 'bold')
  pdf.text(client.name || 'N/A', rightBoxX + 12, contentY)
  contentY += 12
  
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(...COLORS.darkGray)
  if (client.address) {
    const addressLines = pdf.splitTextToSize(client.address, boxWidth - 24)
    addressLines.forEach((line: string, i: number) => {
      if (i < 2) {
        pdf.text(line, rightBoxX + 12, contentY)
        contentY += 10
      }
    })
  }
  if (client.phone) {
    pdf.text(client.phone, rightBoxX + 12, contentY)
    contentY += 10
  }
  if (client.email) {
    pdf.text(client.email, rightBoxX + 12, contentY)
    contentY += 10
  }
  
  yPos += boxHeight + 20
  
  // Services table (similar to quote)
  pdf.setFillColor(...COLORS.gold)
  pdf.rect(margin, yPos, pageWidth - (2 * margin), 22, 'F')
  pdf.setDrawColor(...COLORS.black)
  pdf.setLineWidth(1)
  pdf.line(margin, yPos, pageWidth - margin, yPos)
  pdf.line(margin, yPos + 22, pageWidth - margin, yPos + 22)
  pdf.setFontSize(FONTS.subheading)
  pdf.setTextColor(...COLORS.black)
  pdf.setFont('helvetica', 'bold')
  pdf.text('SERVICES PROVIDED', margin + 12, yPos + 15)
  yPos += 22
  
  const tableStartX = margin
  const tableWidth = pageWidth - (2 * margin)
  pdf.setFillColor(...COLORS.veryLightGray)
  pdf.rect(tableStartX, yPos, tableWidth, 20, 'F')
  
  const descColX = tableStartX + 12
  const qtyColX = pageWidth - 280
  const priceColX = pageWidth - 180
  const totalColX = pageWidth - margin - 12
  
  pdf.setFontSize(9)
  pdf.setTextColor(...COLORS.darkGray)
  pdf.setFont('helvetica', 'bold')
  pdf.text('DESCRIPTION', descColX, yPos + 13)
  pdf.text('QTY', qtyColX, yPos + 13)
  pdf.text('PRICE', priceColX, yPos + 13)
  pdf.text('TOTAL', totalColX, yPos + 13, { align: 'right' })
  
  pdf.setDrawColor(...COLORS.border)
  pdf.setLineWidth(0.5)
  pdf.line(tableStartX, yPos + 20, tableStartX + tableWidth, yPos + 20)
  yPos += 20
  
  if (invoice.items && Array.isArray(invoice.items)) {
    invoice.items.forEach((item: any, index: number) => {
      const quantity = item.qty || 0
      const price = item.unitPrice || 0
      const total = item.total || (quantity * price)
      
      let tempY = yPos + 14
      if (item.serviceDescription?.trim()) {
        const maxWidth = 200
        tempY += Math.ceil(pdf.splitTextToSize(item.serviceDescription, maxWidth).length) * 9
      }
      if (item.warning?.trim()) {
        const maxWidth = 200
        tempY += Math.ceil(pdf.splitTextToSize(item.warning, maxWidth).length) * 9
      }
      const rowHeight = Math.max(tempY - yPos + 10, 35)
      
      if (index % 2 === 1) {
        pdf.setFillColor(...COLORS.cream)
        pdf.rect(tableStartX, yPos, tableWidth, rowHeight, 'F')
      }
      
      pdf.setDrawColor(...COLORS.border)
      pdf.setLineWidth(0.3)
      pdf.line(tableStartX, yPos + rowHeight, tableStartX + tableWidth, yPos + rowHeight)
      
      let contentY = yPos + 14
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(10)
      pdf.setTextColor(...COLORS.black)
      pdf.text(item.description || 'Service', descColX, contentY)
      
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(9)
      pdf.text(quantity.toString(), qtyColX + 10, contentY)
      pdf.text(`${businessProfile.currencySymbol}${price.toFixed(2)}`, priceColX, contentY)
      pdf.setFont('helvetica', 'bold')
      pdf.text(`${businessProfile.currencySymbol}${total.toFixed(2)}`, totalColX, contentY, { align: 'right' })
      contentY += 12
      
      if (item.serviceDescription?.trim()) {
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(FONTS.small)
        pdf.setTextColor(...COLORS.mediumGray)
        const maxWidth = 200
        const lines = pdf.splitTextToSize(item.serviceDescription, maxWidth)
        lines.forEach((line: string) => {
          pdf.text(line, descColX + 5, contentY)
          contentY += 9
        })
      }
      
      if (item.warning?.trim()) {
        pdf.setFont('helvetica', 'italic')
        pdf.setFontSize(FONTS.small)
        pdf.setTextColor(200, 100, 0)
        const maxWidth = 200
        const warnLines = pdf.splitTextToSize(`⚠ ${item.warning}`, maxWidth)
        warnLines.forEach((line: string) => {
          pdf.text(line, descColX + 5, contentY)
          contentY += 9
        })
      }
      
      yPos += rowHeight
    })
  }
  
  pdf.setDrawColor(...COLORS.gold)
  pdf.setLineWidth(2)
  pdf.line(tableStartX, yPos, tableStartX + tableWidth, yPos)
  yPos += 25
  
  // Totals
  const totalsX = pageWidth - margin - 200
  pdf.setFontSize(FONTS.body)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(...COLORS.darkGray)
  
  pdf.text('Subtotal:', totalsX, yPos)
  pdf.text(`${businessProfile.currencySymbol}${(invoice.subtotal || 0).toFixed(2)}`, pageWidth - margin - 12, yPos, { align: 'right' })
  yPos += 12
  
  if ((invoice.tax || 0) > 0) {
    pdf.text('Tax:', totalsX, yPos)
    pdf.text(`${businessProfile.currencySymbol}${(invoice.tax || 0).toFixed(2)}`, pageWidth - margin - 12, yPos, { align: 'right' })
    yPos += 12
  }
  
  if ((invoice.discount || 0) > 0) {
    pdf.setTextColor(200, 0, 0)
    pdf.text('Discount:', totalsX, yPos)
    pdf.text(`-${businessProfile.currencySymbol}${(invoice.discount || 0).toFixed(2)}`, pageWidth - margin - 12, yPos, { align: 'right' })
    pdf.setTextColor(...COLORS.darkGray)
    yPos += 12
  }
  
  yPos += 5
  pdf.setFillColor(...COLORS.gold)
  pdf.rect(totalsX - 10, yPos - 10, 210, 28, 'F')
  pdf.setDrawColor(...COLORS.black)
  pdf.setLineWidth(1.5)
  pdf.rect(totalsX - 10, yPos - 10, 210, 28, 'S')
  
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(FONTS.heading)
  pdf.setTextColor(...COLORS.black)
  pdf.text('TOTAL:', totalsX, yPos + 8)
  pdf.setFontSize(16)
  pdf.text(`${businessProfile.currencySymbol}${invoice.total.toFixed(2)}`, pageWidth - margin - 12, yPos + 8, { align: 'right' })
  
  yPos += 48
  
  // Notes/Terms section
  if (invoice.notes) {
    pdf.setFillColor(...COLORS.gold)
    pdf.rect(margin, yPos, pageWidth - (2 * margin), 18, 'F')
    pdf.setFontSize(9)
    pdf.setTextColor(...COLORS.black)
    pdf.setFont('helvetica', 'bold')
    pdf.text('NOTES', margin + 10, yPos + 12)
    yPos += 25
    
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(FONTS.small)
    pdf.setTextColor(...COLORS.mediumGray)
    const splitNotes = pdf.splitTextToSize(invoice.notes, pageWidth - (2 * margin) - 20)
    splitNotes.forEach((line: string) => {
      pdf.text(line, margin + 10, yPos)
      yPos += 10
    })
  }
  
  // Jobsite Readiness Acknowledgment (match quote ordering: after notes)
  if ((invoice as any).jobsiteReadyAcknowledged && (invoice as any).jobsiteReadyAcknowledgedAt) {
    pdf.setFillColor(...COLORS.gold)
    pdf.rect(margin, yPos, pageWidth - (2 * margin), 18, 'F')
    pdf.setFontSize(9)
    pdf.setTextColor(...COLORS.black)
    pdf.setFont('helvetica', 'bold')
    pdf.text('JOBSITE READINESS', margin + 10, yPos + 12)
    yPos += 30
    
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.setTextColor(...COLORS.mediumGray)
    pdf.text('All plumbing fixtures must be operational before refinishing begins.', margin + 10, yPos)
    yPos += 12
    pdf.text('Faucets must shut off completely and drains must function properly.', margin + 10, yPos)
    yPos += 12
    pdf.text('If plumbing or jobsite conditions prevent work from starting or finishing as scheduled, additional fees may apply.', margin + 10, yPos)
    yPos += 16
    pdf.text('Jobsite Readiness & Plumbing Condition Acknowledged', margin + 10, yPos)
    yPos += 14
    const acknowledgedDate = new Date((invoice as any).jobsiteReadyAcknowledgedAt).toLocaleString()
    pdf.setFontSize(9)
    pdf.text(`Acknowledged on: ${acknowledgedDate}`, margin + 10, yPos)
    yPos += 16
    
    // Water shutoff warranty void notice
    if ((invoice as any).waterShutoffElected) {
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)
      pdf.setTextColor(200, 50, 50) // Red color for warranty void
      pdf.text('Warranty voided due to customer-elected water shutoff.', margin + 10, yPos)
      yPos += 10
    }
  }
  
  // (Moved) Jobsite Readiness acknowledgment now rendered above Notes section
  
  addFooter(pdf, businessProfile)
  pdf.save(`Invoice_${displayInvoiceNumber}_${(client.name || 'Client').replace(/\s+/g, '_')}.pdf`)
}

export async function generateContractPDF(contract: Contract, client: Client, businessProfile: BusinessProfile) {
  // Fetch linked quote data directly from Firestore if contract has a quoteId
  let quoteData: any = null
  if (contract.quoteId) {
    try {
      const { doc, getDoc } = await import('firebase/firestore')
      const { db } = await import('../firebase')
      const quoteSnap = await getDoc(doc(db, 'quotes', contract.quoteId))
      if (quoteSnap.exists()) {
        quoteData = quoteSnap.data()
      } else {
        console.warn(`Contract PDF: Quote not found for quoteId '${contract.quoteId}'. Jobsite Readiness section will not appear.`)
      }
    } catch (error) {
      console.warn(`Contract PDF: Failed to fetch quote '${contract.quoteId}':`, error)
    }
  }
  
  let logoData: { data: string; format: string } | null = null
  if (businessProfile.logo && businessProfile.logo.trim()) {
    logoData = await loadLogoAsBase64(businessProfile.logo)
  }
  
  const pdf = new jsPDF('p', 'pt', 'a4')
  const pageWidth = pdf.internal.pageSize.getWidth()
  const margin = 40
  let yPos = addHeader(pdf, businessProfile, 'CONTRACT', logoData)
  
  // Contract details box
  pdf.setDrawColor(...COLORS.gold)
  pdf.setLineWidth(1)
  pdf.rect(margin, yPos, pageWidth - (2 * margin), 110)
  yPos += 15
  
  pdf.setFontSize(11)
  pdf.setTextColor(...COLORS.black)
  pdf.setFont('helvetica', 'bold')
  pdf.text('CONTRACT DETAILS', margin + 12, yPos)
  yPos += 15
  
  pdf.setFontSize(FONTS.body)
  pdf.setTextColor(...COLORS.darkGray)
  pdf.setFont('helvetica', 'normal')
  
  pdf.setFont('helvetica', 'bold')
  pdf.text('Contract #:', margin + 12, yPos)
  pdf.setFont('helvetica', 'normal')
  pdf.text(contract.id || 'N/A', margin + 100, yPos)
  yPos += 15
  
  pdf.setFont('helvetica', 'bold')
  pdf.text('Date:', margin + 12, yPos)
  pdf.setFont('helvetica', 'normal')
  pdf.text(new Date(contract.createdAt || Date.now()).toLocaleDateString(), margin + 100, yPos)
  yPos += 15
  
  pdf.setFont('helvetica', 'bold')
  pdf.text('Client:', margin + 12, yPos)
  pdf.setFont('helvetica', 'normal')
  pdf.text(client.name || 'N/A', margin + 100, yPos)
  yPos += 15
  
  if (contract.totalAmount) {
    pdf.setFont('helvetica', 'bold')
    pdf.text('Amount:', margin + 12, yPos)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(...COLORS.gold)
    pdf.text(`${businessProfile.currencySymbol}${contract.totalAmount.toFixed(2)}`, margin + 100, yPos)
    pdf.setTextColor(...COLORS.darkGray)
  }
  
  yPos += 35
  
  if (contract.terms) {
    pdf.setFillColor(...COLORS.gold)
    pdf.rect(margin, yPos, pageWidth - (2 * margin), 18, 'F')
    pdf.setFontSize(9)
    pdf.setTextColor(...COLORS.black)
    pdf.setFont('helvetica', 'bold')
    pdf.text('TERMS & CONDITIONS', margin + 10, yPos + 12)
    yPos += 25
    
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(FONTS.small)
    pdf.setTextColor(...COLORS.mediumGray)
    const splitTerms = pdf.splitTextToSize(contract.terms, pageWidth - (2 * margin) - 20)
    splitTerms.forEach((line: string) => {
      pdf.text(line, margin + 10, yPos)
      yPos += 10
    })
    yPos += 20
  }
  
  if (contract.scope) {
    pdf.setFillColor(...COLORS.gold)
    pdf.rect(margin, yPos, pageWidth - (2 * margin), 18, 'F')
    pdf.setFontSize(9)
    pdf.setTextColor(...COLORS.black)
    pdf.setFont('helvetica', 'bold')
    pdf.text('SCOPE OF WORK', margin + 10, yPos + 12)
    yPos += 25
    
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(FONTS.small)
    pdf.setTextColor(...COLORS.mediumGray)
    const splitScope = pdf.splitTextToSize(contract.scope, pageWidth - (2 * margin) - 20)
    splitScope.forEach((line: string) => {
      pdf.text(line, margin + 10, yPos)
      yPos += 10
    })
    yPos += 20
  }
  
  // Jobsite Readiness acknowledgment (with gold header bar like Quote and Invoice)
  // Render based on linked quote's fields, not contract fields
  if (quoteData && quoteData.jobsiteReadyAcknowledged && quoteData.jobsiteReadyAcknowledgedAt) {
    pdf.setFillColor(...COLORS.gold)
    pdf.rect(margin, yPos, pageWidth - (2 * margin), 18, 'F')
    pdf.setFontSize(9)
    pdf.setTextColor(...COLORS.black)
    pdf.setFont('helvetica', 'bold')
    pdf.text('JOBSITE READINESS', margin + 10, yPos + 12)
    yPos += 30
    
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.setTextColor(...COLORS.mediumGray)
    // Plumbing requirement explanatory text
    pdf.text('All plumbing fixtures must be operational before refinishing begins.', margin + 10, yPos)
    yPos += 12
    pdf.text('Faucets must shut off completely and drains must function properly.', margin + 10, yPos)
    yPos += 12
    pdf.text('If plumbing or jobsite conditions prevent work from starting or finishing as scheduled, additional fees may apply.', margin + 10, yPos)
    yPos += 16
    
    // Acknowledgment lines
    pdf.text('Jobsite Readiness & Plumbing Condition Acknowledged', margin + 10, yPos)
    yPos += 14
    const acknowledgedDate = new Date(quoteData.jobsiteReadyAcknowledgedAt).toLocaleString()
    pdf.setFontSize(9)
    pdf.text(`Acknowledged on: ${acknowledgedDate}`, margin + 10, yPos)
    yPos += 16
    
    // Water shutoff warranty void notice
    if (quoteData.waterShutoffElected) {
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)
      pdf.setTextColor(200, 50, 50) // Red color for warranty void
      pdf.text('Warranty voided due to customer-elected water shutoff.', margin + 10, yPos)
      yPos += 10
    }
  }
  
  addFooter(pdf, businessProfile)
  pdf.save(`Contract_${contract.id || 'Unknown'}_${(client.name || 'Client').replace(/\s+/g, '_')}.pdf`)
}
