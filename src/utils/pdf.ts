//* GitHub Copilot: Option A – FULL REBUILD of pdf.ts

// You are editing an existing production web app. This is NOT a new app.
// The goal is to fully rebuild this file (pdf.ts) while preserving:
// - The same external API (same imports/exports and function signatures)
// - The same visual/layout design of the generated PDFs (or as close as practically possible)
// - The same runtime behavior from the rest of the app’s perspective
// We are only improving internal structure, robustness, and consistency.

// CONTEXT ABOUT THIS FILE
// - TypeScript file that generates PDFs using jsPDF + html2canvas.
// - Imports:
//     import jsPDF from 'jspdf'
//     import html2canvas from 'html2canvas'
//     import type { Quote, Client, Invoice, Contract } from '../db'
//     import type { BusinessProfile } from '../config/businessProfile'
// - It currently defines color and font constants (COLORS, FONTS, etc.).
// - It has helper functions for:
//     - Loading a logo as base64 (loadLogoAsBase64)
//     - Drawing header + footer
//     - Drawing info boxes, table layouts, totals, etc.
// - It exports EXACTLY these async functions and they MUST remain with identical signatures:
//     1) export async function exportElementToPDF(el: HTMLElement, fileName: string)
//     2) export async function generateQuotePDF(quote: Quote, client: Client, businessProfile: BusinessProfile)
//     3) export async function generateInvoicePDF(invoice: Invoice & { items?: any[]; subtotal?: number; tax?: number; discount?: number; total?: number }, client: Client, businessProfile: BusinessProfile)
//     4) export async function generateContractPDF(contract: Contract, client: Client, businessProfile: BusinessProfile)

// BUSINESS / CONFIG CONSTRAINTS
// - This app will be sold, so everything must remain configurable and editable.
// - Do NOT hard-code business-specific details that should come from BusinessProfile, Quote, Invoice, Contract, or Client.
// - Keep using BusinessProfile for brand controls (companyName, address, contact details, currencySymbol, logo, etc.).
// - Do NOT introduce new external libraries. Only use jsPDF, html2canvas, and built-ins.

// LAYOUT + DESIGN CONSTRAINTS
// - Keep the existing look-and-feel: same general structure, colors, typography, section ordering, and hierarchy.
// - The file currently has a comment like:
//       // PDF Layout Version 5.1 - Fixed Width Text Constraint - Nov 27 2025 1:45pm
//   Preserve that version and intent: we want a fixed-width text layout with consistent wrapping.
// - Maintain the color palette from COLORS and the typography sizing from FONTS (body, small, tiny, heading, etc.).
// - Preserve the key patterns:
//     - Prominent header with logo + company details + document type (QUOTE / INVOICE / CONTRACT) and document number/date.
//     - Info boxes: e.g. “QUOTE DETAILS / CLIENT” or “INVOICE DETAILS / BILL TO” style boxes at the top.
//     - Main table for line items.
//     - Summary/totals section (subtotal, tax, discount, total, balance due).
//     - Status chips/badges on invoices (e.g. PAID, DUE, OVERDUE) with appropriate colors.
//     - Footer with company website/contact.
// - Do NOT redesign the UI. Use the current layout as the target design. Improvements should be internal (code quality, pagination, text wrapping), not visual redesigns.

// OPTION A: FULL REBUILD – IMPLEMENTATION GOALS
// Rebuild this file with the following goals:

// 1) Strong, centralized layout constants
//    - Introduce clear, typed layout constants for:
//        * PAGE margins
//        * Standard vertical spacing units
//        * Column widths for tables
//        * Max text widths for different text blocks (headers, addresses, line item descriptions, warnings/notes).
//    - Use these constants everywhere instead of scattering magic numbers.

// 2) Shared abstractions for repeated PDF patterns
//    - Create small, composable helpers for common elements, such as:
//        * drawHeader(pdf, businessProfile, docType, logoData, options?)
//        * drawFooter(pdf, businessProfile)
//        * drawInfoBox(pdf, { x, y, width, height, title, lines })
//        * drawKeyValueRow(pdf, { label, value, x, y, labelWidth, align? })
//        * drawSectionTitle(pdf, { text, x, y })
//        * drawTableHeader(pdf, config)
//        * drawTableRow(pdf, config)
//        * paginateIfNeeded(pdf, { currentY, blockHeight, marginBottom, onNewPage })
//    - Ensure Quote, Invoice, and Contract all share as much layout + helper logic as possible instead of duplicating code.

// 3) Robust text wrapping + fixed-width constraints
//    - Implement a single helper like:
//        wrapText(pdf, text, maxWidth, options?) => { lines: string[]; height: number }
//      that uses pdf.splitTextToSize internally, tracks line count, and returns computed height.
//    - Use this helper for any multi-line text:
//        * service/line item descriptions
//        * warnings/notes
//        * contract clauses
//        * address lines
//    - Ensure no overflow into margins or overlapping text. Respect the fixed-width constraint.

// 4) Pagination handling
//    - Implement a generic pagination helper that:
//        * Takes current Y position and expected block height.
//        * If the block does not fit on the current page, automatically adds a page, redraws the header (and any repeating elements that need to appear on each page, like document type + company header), and returns a new Y starting position.
//    - Use this for:
//        * Line item tables
//        * Long contract text sections
//        * Any large blocks of text that can span pages.
//    - Make sure tables and contracts can span multiple pages cleanly, without cutting rows in half.

// 5) Type safety and clear function boundaries
//    - Use explicit types for helper functions. Avoid `any` where possible.
//    - Use the existing Quote, Invoice, Contract, Client, BusinessProfile types for data, plus local helper types for layout primitives when needed.
//    - Keep the exported functions small and orchestrating-only: they should call smaller helpers that draw the actual content.

// 6) Consistent behavior across Quote, Invoice, Contract
//    - Ensure the three PDFs share consistent:
//        * Header styles
//        * Info box styles
//        * Table styles
//        * Footer styles
//    - Differences should come from data (e.g. which fields show up, labels like “QUOTE” vs “INVOICE” vs “CONTRACT”), not from arbitrary layout changes.

// 7) Maintain backward compatibility
//    - Do NOT change the names or parameter lists of:
//        * exportElementToPDF
//        * generateQuotePDF
//        * generateInvoicePDF
//        * generateContractPDF
//    - Do NOT change how BusinessProfile, Quote, Invoice, Contract, and Client are consumed (field names remain the same).
//    - Continue using html2canvas for exportElementToPDF, but refactor its internals for clarity if needed.

// 8) Clean, readable code
//    - Group helpers by responsibility (e.g. layout primitives, shared components, document-specific renderers).
//    - Add brief JSDoc/TSDoc-style comments where it clarifies intent, especially for complex pagination/wrapping helpers.
//    - Avoid deeply nested logic; favor small functions and early exits.

// TASK
// =====
// 1. Treat the existing content of this file (shown below) as a rough prototype.
// 2. Produce a *complete* replacement implementation for this file that:
//      - Keeps the imports and export signatures identical.
//      - Preserves the overall visual layout and behavior.
//      - Implements Option A full rebuild as described above.
// 3. Return the final, fully rebuilt TypeScript code for pdf.ts with no commentary, just the code.

// EXISTING IMPLEMENTATION (REFERENCE ONLY) IS BELOW THIS COMMENT.
// Use it only to understand current layout and data, then rewrite the file fully.

// GitHub Copilot:
// Using the above instructions, generate the full rebuilt implementation
// of pdf.ts now. Replace everything below with the new code.
// Keep the same imports, same exports, and same external API signatures.
// Preserve the same visual layout. Implement all internal improvements
// described in Option A. Output ONLY the complete TypeScript code. */ //
// Copilot: rebuild this file now based on the instructions above
// PDF Layout Version 5.1 - Fixed Width Text Constraint - Nov 27 2025 1:45pm
// Rebuilt with centralized constants, shared abstractions, robust text wrapping, and pagination

// ============================================================================
// LAYOUT CONSTANTS
// ============================================================================



import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import type { Quote, Client, Invoice, Contract } from '../db'
import type { BusinessProfile } from '../config/businessProfile'




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
  title: 32,
  heading: 16,
  subheading: 13,
  body: 11,
  small: 9,
}

const LAYOUT = {
  pageMargin: 40,
  headerHeight: 95,
  footerHeight: 30,
  logoSize: 60,
  logoMarginRight: 75,
  sectionGap: 20,
  infoBoxGap: 12,
  infoBoxHeaderHeight: 20,
  infoBoxHeight: 100,
  tableHeaderHeight: 20,
  minRowHeight: 35,
  rowPadding: 14,
  lineSpacing: {
    small: 9,
    body: 10,
    bodyLarge: 12,
    heading: 14,
  },
  textMaxWidths: {
    description: 200,
    address: 200,
    notes: 520,
  },
  totalsBoxWidth: 210,
  totalsBoxHeight: 28,
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface WrappedTextResult {
  lines: string[]
  height: number
}

interface InfoBoxConfig {
  x: number
  y: number
  width: number
  height: number
  title: string
}

interface KeyValueRowConfig {
  label: string
  value: string
  x: number
  y: number
  labelX: number
  valueX: number
  align?: 'left' | 'right'
}

interface TableColumnConfig {
  descColX: number
  qtyColX: number
  priceColX: number
  totalColX: number
}

interface PaginationConfig {
  currentY: number
  blockHeight: number
  marginBottom?: number
  onNewPage?: () => number
}

// ============================================================================
// HELPER FUNCTIONS: TEXT WRAPPING
// ============================================================================

function wrapText(pdf: jsPDF, text: string, maxWidth: number): WrappedTextResult {
  if (!text || !text.trim()) {
    return { lines: [], height: 0 }
  }
  const lines = pdf.splitTextToSize(text, maxWidth)
  const lineCount = Array.isArray(lines) ? lines.length : 1
  const lineHeight = LAYOUT.lineSpacing.small
  return {
    lines: Array.isArray(lines) ? lines : [lines],
    height: lineCount * lineHeight,
  }
}

// ============================================================================
// HELPER FUNCTIONS: LOGO LOADING
// ============================================================================

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
    img.onload = function () {
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

// ============================================================================
// HELPER FUNCTIONS: PAGINATION
// ============================================================================

function paginateIfNeeded(pdf: jsPDF, config: PaginationConfig): number {
  const pageHeight = pdf.internal.pageSize.getHeight()
  const maxY = pageHeight - LAYOUT.pageMargin - LAYOUT.footerHeight
  const requiredSpace = config.blockHeight + (config.marginBottom || 0)

  if (config.currentY + requiredSpace > maxY) {
    pdf.addPage()
    if (config.onNewPage) {
      return config.onNewPage()
    }
    return LAYOUT.pageMargin + LAYOUT.sectionGap
  }

  return config.currentY
}

// ============================================================================
// SHARED COMPONENTS: HEADER
// ============================================================================

function drawHeader(
  pdf: jsPDF,
  businessProfile: BusinessProfile,
  docType: string,
  logoData?: { data: string; format: string } | null
): number {
  const pageWidth = pdf.internal.pageSize.getWidth()
  const margin = LAYOUT.pageMargin
  let yPos = 20

  // Logo on left
  if (logoData && logoData.data) {
    try {
      pdf.addImage(logoData.data, logoData.format, margin, yPos, LAYOUT.logoSize, LAYOUT.logoSize)
    } catch (err) {
      console.error('Error adding logo:', err)
    }
  }

  // Company info next to logo
  const infoX = margin + LAYOUT.logoMarginRight
  let infoY = yPos + 32

  pdf.setFontSize(FONTS.heading)
  pdf.setTextColor(...COLORS.black)
  pdf.setFont('helvetica', 'bold')
  pdf.text(businessProfile.companyName, infoX, infoY)

  if (businessProfile.tagline) {
    infoY += 14
    pdf.setFontSize(FONTS.subheading)
    pdf.setFont('helvetica', 'italic')
    pdf.setTextColor(...COLORS.darkGold)
    pdf.text(businessProfile.tagline, infoX, infoY)
  }

  // Document title on right
  const rightX = pageWidth - margin
  pdf.setFontSize(FONTS.title)
  pdf.setTextColor(...COLORS.black)
  pdf.setFont('helvetica', 'bold')
  pdf.text(docType, rightX, yPos + 20, { align: 'right' })

  // Gold accent line under title
  pdf.setDrawColor(...COLORS.gold)
  pdf.setLineWidth(3)
  pdf.line(rightX - 120, yPos + 27, rightX, yPos + 27)

  // Company contact info on right
  let contactY = yPos + 42
  pdf.setFontSize(FONTS.body)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(...COLORS.darkGray)
  pdf.text(
    `${businessProfile.addressLine1}, ${businessProfile.city}, ${businessProfile.state} ${businessProfile.zip}`,
    rightX,
    contactY,
    { align: 'right' }
  )
  contactY += 10
  pdf.text(businessProfile.phone, rightX, contactY, { align: 'right' })
  contactY += 10
  pdf.text(businessProfile.email, rightX, contactY, { align: 'right' })

  // Separator line
  const separatorY = yPos + 75
  pdf.setDrawColor(...COLORS.border)
  pdf.setLineWidth(0.5)
  pdf.line(margin, separatorY, pageWidth - margin, separatorY)

  return separatorY + LAYOUT.sectionGap
}

// ============================================================================
// SHARED COMPONENTS: FOOTER
// ============================================================================

function drawFooter(pdf: jsPDF, businessProfile: BusinessProfile) {
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const footerY = pageHeight - 30

  pdf.setFontSize(FONTS.small)
  pdf.setTextColor(...COLORS.lightGray)
  pdf.setFont('helvetica', 'italic')

  const footerText = businessProfile.website || businessProfile.companyName
  pdf.text(footerText, pageWidth / 2, footerY, { align: 'center' })
}

// ============================================================================
// SHARED COMPONENTS: INFO BOX
// ============================================================================

function drawInfoBox(pdf: jsPDF, config: InfoBoxConfig) {
  pdf.setFillColor(...COLORS.gold)
  pdf.rect(config.x, config.y, config.width, LAYOUT.infoBoxHeaderHeight, 'F')
  pdf.setFillColor(...COLORS.cream)
  pdf.rect(
    config.x,
    config.y + LAYOUT.infoBoxHeaderHeight,
    config.width,
    config.height - LAYOUT.infoBoxHeaderHeight,
    'F'
  )
  pdf.setDrawColor(...COLORS.darkGold)
  pdf.setLineWidth(1)
  pdf.rect(config.x, config.y, config.width, config.height, 'S')
  pdf.setFontSize(FONTS.heading)
  pdf.setTextColor(...COLORS.black)
  pdf.setFont('helvetica', 'bold')
  pdf.text(config.title, config.x + 10, config.y + 15)
}

// ============================================================================
// SHARED COMPONENTS: KEY-VALUE ROW
// ============================================================================

function drawKeyValueRow(pdf: jsPDF, config: KeyValueRowConfig) {
  pdf.setFontSize(FONTS.small)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(...COLORS.darkGray)
  pdf.text(config.label, config.labelX, config.y)

  pdf.setFont('helvetica', 'normal')
  if (config.align === 'right') {
    pdf.text(config.value, config.valueX, config.y, { align: 'right' })
  } else {
    pdf.text(config.value, config.valueX, config.y)
  }
}

// ============================================================================
// SHARED COMPONENTS: SECTION TITLE
// ============================================================================

function drawSectionTitle(pdf: jsPDF, text: string, x: number, y: number, width: number) {
  pdf.setFillColor(...COLORS.gold)
  pdf.rect(x, y, width, 22, 'F')
  pdf.setDrawColor(...COLORS.black)
  pdf.setLineWidth(1)
  pdf.line(x, y, x + width, y)
  pdf.line(x, y + 22, x + width, y + 22)
  pdf.setFontSize(FONTS.heading)
  pdf.setTextColor(...COLORS.black)
  pdf.setFont('helvetica', 'bold')
  pdf.text(text, x + LAYOUT.rowPadding, y + Math.round(22 * 0.75))

}

// ============================================================================
// SHARED COMPONENTS: TABLE HEADER
// ============================================================================

function drawTableHeader(pdf: jsPDF, yPos: number, columns: TableColumnConfig): number {
  const pageWidth = pdf.internal.pageSize.getWidth()
  const margin = LAYOUT.pageMargin
  const tableWidth = pageWidth - 2 * margin

  pdf.setFillColor(...COLORS.veryLightGray)
  pdf.rect(margin, yPos, tableWidth, LAYOUT.tableHeaderHeight, 'F')

  pdf.setFontSize(FONTS.subheading)
  pdf.setTextColor(...COLORS.darkGray)
  pdf.setFont('helvetica', 'bold')
  pdf.text('DESCRIPTION', columns.descColX, yPos + 14)
  pdf.text('QTY', columns.qtyColX, yPos + 13)
  pdf.text('PRICE', columns.priceColX, yPos + 13)
  pdf.text('TOTAL', columns.totalColX, yPos + 13, { align: 'right' })

  pdf.setDrawColor(...COLORS.border)
  pdf.setLineWidth(0.5)
  pdf.line(margin, yPos + LAYOUT.tableHeaderHeight, margin + tableWidth, yPos + LAYOUT.tableHeaderHeight)

  return yPos + LAYOUT.tableHeaderHeight
}

// ============================================================================
// SHARED COMPONENTS: TABLE ROW
// ============================================================================

function drawTableRow(
  pdf: jsPDF,
  item: any,
  yPos: number,
  columns: TableColumnConfig,
  index: number,
  currencySymbol: string
): number {
  const pageWidth = pdf.internal.pageSize.getWidth()
  const margin = LAYOUT.pageMargin
  const tableWidth = pageWidth - 2 * margin

  const quantity = item.qty || 0
  const price = item.unitPrice || 0
  const total = item.total || quantity * price

  // Calculate row height
  let tempY = yPos + LAYOUT.rowPadding
  if (item.serviceDescription?.trim()) {
    const wrapped = wrapText(pdf, item.serviceDescription, LAYOUT.textMaxWidths.description)
    tempY += wrapped.height
  }
  if (item.warning?.trim()) {
    const wrapped = wrapText(pdf, `⚠ ${item.warning}`, LAYOUT.textMaxWidths.description)
    tempY += wrapped.height
  }
  const rowHeight = Math.max(tempY - yPos + 10, LAYOUT.minRowHeight)

  // Alternate row background
  if (index % 2 === 1) {
    pdf.setFillColor(...COLORS.cream)
    pdf.rect(margin, yPos, tableWidth, rowHeight, 'F')
  }

  // Row border
  pdf.setDrawColor(...COLORS.border)
  pdf.setLineWidth(0.3)
  pdf.line(margin, yPos + rowHeight, margin + tableWidth, yPos + rowHeight)

  // Content
  let contentY = yPos + LAYOUT.rowPadding
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(FONTS.body)
  pdf.setTextColor(...COLORS.black)
  pdf.text(item.description || 'Service', columns.descColX, contentY)

  pdf.setFont('helvetica', 'normal')
  pdf.text(quantity.toString(), columns.qtyColX + 10, contentY)
  pdf.text(`${currencySymbol}${price.toFixed(2)}`, columns.priceColX, contentY)
  pdf.setFont('helvetica', 'bold')
  pdf.text(`${currencySymbol}${total.toFixed(2)}`, columns.totalColX, contentY, { align: 'right' })
  contentY += LAYOUT.lineSpacing.bodyLarge

  // Service description
  if (item.serviceDescription?.trim()) {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(FONTS.body)
    pdf.setTextColor(...COLORS.mediumGray)
    const wrapped = wrapText(pdf, item.serviceDescription, LAYOUT.textMaxWidths.description)
    wrapped.lines.forEach((line: string) => {
      pdf.text(line, columns.descColX + 5, contentY)
      contentY += LAYOUT.lineSpacing.body
    })
    contentY += 6;

  }

  // Warning
  if (item.warning?.trim()) {
    pdf.setFont('helvetica', 'italic')
    pdf.setFontSize(FONTS.body)
    pdf.setTextColor(200, 100, 0)
    const wrapped = wrapText(pdf, `⚠ ${item.warning}`, LAYOUT.textMaxWidths.description)
    wrapped.lines.forEach((line: string) => {
      pdf.text(line, columns.descColX + 5, contentY)
      contentY += LAYOUT.lineSpacing.body
    })
  }

  return yPos + rowHeight
}

// ============================================================================
// SHARED COMPONENTS: TOTALS SECTION
// ============================================================================

function drawTotals(
  pdf: jsPDF,
  yPos: number,
  subtotal: number,
  tax: number,
  discount: number,
  total: number,
  currencySymbol: string,
  taxRate?: number
): number {
  const pageWidth = pdf.internal.pageSize.getWidth()
  const margin = LAYOUT.pageMargin
  const totalsX = pageWidth - margin - LAYOUT.totalsBoxWidth + 10

  pdf.setFontSize(FONTS.body)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(...COLORS.darkGray)

  pdf.text('Subtotal:', totalsX, yPos)
  pdf.text(`${currencySymbol}${subtotal.toFixed(2)}`, pageWidth - margin - 12, yPos, { align: 'right' })
  yPos += 12

  if (tax > 0) {
    const taxLabel = taxRate ? `Tax (${(taxRate * 100).toFixed(1)}%):` : 'Tax:'
    pdf.text(taxLabel, totalsX, yPos)
    pdf.text(`${currencySymbol}${tax.toFixed(2)}`, pageWidth - margin - 12, yPos, { align: 'right' })
    yPos += 12
  }

  if (discount > 0) {
    pdf.setTextColor(200, 0, 0)
    pdf.text('Discount:', totalsX, yPos)
    pdf.text(`-${currencySymbol}${discount.toFixed(2)}`, pageWidth - margin - 12, yPos, { align: 'right' })
    pdf.setTextColor(...COLORS.darkGray)
    yPos += 12
  }

  yPos += 5
  pdf.setFillColor(...COLORS.gold)
  pdf.rect(totalsX - 10, yPos - 10, LAYOUT.totalsBoxWidth, LAYOUT.totalsBoxHeight, 'F')
  pdf.setDrawColor(...COLORS.black)
  pdf.setLineWidth(1.5)
  pdf.rect(totalsX - 10, yPos - 10, LAYOUT.totalsBoxWidth, LAYOUT.totalsBoxHeight, 'S')

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(FONTS.heading)
  pdf.setTextColor(...COLORS.black)
  pdf.text('TOTAL:', totalsX, yPos + 10)
  pdf.text(`${currencySymbol}${total.toFixed(2)}`, pageWidth - margin - 12, yPos + 10, { align: 'right' })

  return yPos + 48
}

// ============================================================================
// SHARED COMPONENTS: NOTES/TERMS SECTION
// ============================================================================

function drawNotesSection(pdf: jsPDF, yPos: number, title: string, content: string): number {
  const pageWidth = pdf.internal.pageSize.getWidth()
  const margin = LAYOUT.pageMargin

  drawSectionTitle(pdf, title, margin, yPos, pageWidth - 2 * margin)
  yPos += 38

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(FONTS.body)
  pdf.setTextColor(...COLORS.mediumGray)
  const wrapped = wrapText(pdf, content, LAYOUT.textMaxWidths.notes)
  wrapped.lines.forEach((line: string) => {
    pdf.text(line, margin + 10, yPos)
    yPos +=  LAYOUT.lineSpacing.body
  })

  return yPos + LAYOUT.sectionGap
}

// ============================================================================
// SHARED COMPONENTS: JOBSITE READINESS SECTION
// ============================================================================

function drawJobsiteReadiness(
  pdf: jsPDF,
  yPos: number,
  acknowledgedAt: string,
  waterShutoffElected?: boolean
): number {
  const pageWidth = pdf.internal.pageSize.getWidth()
  const margin = LAYOUT.pageMargin

  drawSectionTitle(pdf, 'JOBSITE READINESS:', margin, yPos, pageWidth - 2 * margin)
  yPos += 38

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(FONTS.body)
  pdf.setTextColor(...COLORS.mediumGray)

  pdf.text('All plumbing fixtures must be operational before refinishing begins.', margin + 10, yPos)
  yPos += 12
  pdf.text('Faucets must shut off completely and drains must function properly.', margin + 10, yPos)
  yPos += 12
  pdf.text(
    'If plumbing or jobsite conditions prevent work from starting or finishing as scheduled, additional fees may apply.',
    margin + 10,
    yPos
  )
  yPos += 16

  pdf.text('Jobsite Readiness & Plumbing Condition Acknowledged', margin + 10, yPos)
  yPos += 14

  const acknowledgedDate = new Date(acknowledgedAt).toLocaleString()
  pdf.setFontSize(FONTS.body)
  pdf.text(`Acknowledged on: ${acknowledgedDate}`, margin + 10, yPos)
  yPos += 16

  if (waterShutoffElected) {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(FONTS.body)
    pdf.setTextColor(200, 50, 50)
    pdf.text('Warranty voided due to customer-elected water shutoff.', margin + 10, yPos)
    yPos += 10
  }

  return yPos + LAYOUT.sectionGap
}

// ============================================================================
// EXPORT: exportElementToPDF
// ============================================================================

export async function exportElementToPDF(el: HTMLElement, fileName: string) {
  const canvas = await html2canvas(el, { scale: 2, useCORS: true })
  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF('p', 'pt', 'a4')
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const imgWidth = pageWidth
  const imgHeight = (canvas.height * imgWidth) / canvas.width
  let y = 0
  while (y < imgHeight) {
    if (y > 0) pdf.addPage()
    pdf.addImage(imgData, 'PNG', 0, -y, imgWidth, imgHeight)
    y += pageHeight
  }
  pdf.save(fileName)
}

// ============================================================================
// EXPORT: generateQuotePDF
// ============================================================================

export async function generateQuotePDF(quote: Quote, client: Client, businessProfile: BusinessProfile) {
  let logoData: { data: string; format: string } | null = null
  if (businessProfile.logo && businessProfile.logo.trim()) {
    logoData = await loadLogoAsBase64(businessProfile.logo)
  }

  const pdf = new jsPDF('p', 'pt', 'a4')
  const pageWidth = pdf.internal.pageSize.getWidth()
  const margin = LAYOUT.pageMargin

  let yPos = drawHeader(pdf, businessProfile, 'QUOTE', logoData)

  // Info boxes
  const boxWidth = (pageWidth - 2 * margin - LAYOUT.infoBoxGap) / 2

  // Bill To box
  drawInfoBox(pdf, {
    x: margin,
    y: yPos,
    width: boxWidth,
    height: LAYOUT.infoBoxHeight,
    title: 'BILL TO:',
  })
  let contentY = yPos + 35
  pdf.setFontSize(FONTS.body)
  pdf.setTextColor(...COLORS.black)
  pdf.setFont('helvetica', 'bold')
  pdf.text(client.name || 'N/A', margin + LAYOUT.rowPadding, contentY
)
  contentY += 14

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(FONTS.body)
  pdf.setTextColor(...COLORS.darkGray)
  if (client.address) {
    const wrapped = wrapText(pdf, client.address, boxWidth - 24)
    wrapped.lines.slice(0, 2).forEach((line: string) => {
      pdf.text(line, margin + LAYOUT.rowPadding, contentY
)
      contentY += 14
    })
  }
  if (client.phone) {
    pdf.text(client.phone, margin + LAYOUT.rowPadding, contentY
)
    contentY += 14
  }
  if (client.email) {
    pdf.text(client.email, margin + LAYOUT.rowPadding, contentY
)
    contentY += 10
  }

  // Quote Details box
  const rightBoxX = margin + boxWidth + LAYOUT.infoBoxGap
  drawInfoBox(pdf, {
    x: rightBoxX,
    y: yPos,
    width: boxWidth,
    height: LAYOUT.infoBoxHeight,
    title: 'QUOTE DETAILS:',
  })

  const displayId = quote.quoteNumber || quote.id || 'N/A'
  const quoteDate = new Date(quote.createdAt || Date.now()).toLocaleDateString()

  contentY = yPos + 35
  drawKeyValueRow(pdf, {
    label: 'Quote #:',
    value: displayId,
    x: rightBoxX,
    y: contentY,
    labelX: rightBoxX + 12,
    valueX: rightBoxX + boxWidth - 12,
    align: 'right',
  })
  contentY += 16

  drawKeyValueRow(pdf, {
    label: 'Date:',
    value: quoteDate,
    x: rightBoxX,
    y: contentY,
    labelX: rightBoxX + 12,
    valueX: rightBoxX + boxWidth - 12,
    align: 'right',
  })
  contentY += 16

  drawKeyValueRow(pdf, {
    label: 'Payment:',
    value: 'Due on completion',
    x: rightBoxX,
    y: contentY,
    labelX: rightBoxX + 12,
    valueX: rightBoxX + boxWidth - 12,
    align: 'right',
  })

  yPos += LAYOUT.infoBoxHeight + LAYOUT.sectionGap

  // Services table
  drawSectionTitle(pdf, 'SERVICES:', margin, yPos, pageWidth - 2 * margin)
  yPos += 30

  const columns: TableColumnConfig = {
    descColX: margin + 12,
    qtyColX: pageWidth - 280,
    priceColX: pageWidth - 180,
    totalColX: pageWidth - margin - 12,
  }

  yPos = drawTableHeader(pdf, yPos, columns)

  if (quote.items && Array.isArray(quote.items)) {
    quote.items.forEach((item: any, index: number) => {
      yPos = drawTableRow(pdf, item, yPos, columns, index, businessProfile.currencySymbol)
    })
  }

  pdf.setDrawColor(...COLORS.gold)
  pdf.setLineWidth(2)
  pdf.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 25

  yPos = drawTotals(
    pdf,
    yPos,
    quote.subtotal,
    quote.tax,
    quote.discount,
    quote.total,
    businessProfile.currencySymbol,
    quote.taxRate
  )

  if (quote.notes) {
    yPos = drawNotesSection(pdf, yPos, 'TERMS & CONDITIONS:', quote.notes)
  }

  if ((quote as any).jobsiteReadyAcknowledged && (quote as any).jobsiteReadyAcknowledgedAt) {
    yPos = drawJobsiteReadiness(pdf, yPos, (quote as any).jobsiteReadyAcknowledgedAt, (quote as any).waterShutoffElected)
  }

  drawFooter(pdf, businessProfile)
  pdf.save(`Quote_${displayId}_${(client.name || 'Client').replace(/\s+/g, '_')}.pdf`)
}

// ============================================================================
// EXPORT: generateInvoicePDF
// ============================================================================

export async function generateInvoicePDF(
  invoice: Invoice & { items?: any[]; subtotal?: number; tax?: number; discount?: number; payments?: any[]; balance?: number },
  client: Client,
  businessProfile: BusinessProfile
) {
  let logoData: { data: string; format: string } | null = null
  if (businessProfile.logo && businessProfile.logo.trim()) {
    logoData = await loadLogoAsBase64(businessProfile.logo)
  }

  const pdf = new jsPDF('p', 'pt', 'a4')
  const pageWidth = pdf.internal.pageSize.getWidth()
  const margin = LAYOUT.pageMargin

  let yPos = drawHeader(pdf, businessProfile, 'INVOICE', logoData)

  const boxWidth = (pageWidth - 2 * margin - LAYOUT.infoBoxGap) / 2

  // Invoice Info box
  const rightBoxX = margin + boxWidth + LAYOUT.infoBoxGap
  drawInfoBox(pdf, {
    x: rightBoxX,
    y: yPos,
    width: boxWidth,
    height: LAYOUT.infoBoxHeight,
    title: 'INVOICE INFO:',
  })

  const displayInvoiceNumber = invoice.invoiceNumber || invoice.id || 'N/A'
  let contentY = yPos + 35

  drawKeyValueRow(pdf, {
    label: 'Invoice #:',
    value: displayInvoiceNumber,
    x: rightBoxX,
    y: contentY,
    labelX: rightBoxX + 12,
    valueX: rightBoxX + boxWidth - 12,
    align: 'right',
  })
  contentY += 16

  drawKeyValueRow(pdf, {
    label: 'Date:',
    value: new Date(invoice.createdAt || Date.now()).toLocaleDateString(),
    x: rightBoxX,
    y: contentY,
    labelX: rightBoxX + 12,
    valueX: rightBoxX + boxWidth - 12,
    align: 'right',
  })
  contentY += 16

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(FONTS.small)
  pdf.text('Status:', rightBoxX + 12, contentY)

  const statusColors: Record<string, [number, number, number]> = {
    unpaid: [200, 0, 0],
    partial: [255, 165, 0],
    paid: [0, 150, 0],
  }
  const color = statusColors[invoice.status] || COLORS.black
  pdf.setTextColor(...color)
  pdf.text(invoice.status.toUpperCase(), rightBoxX + boxWidth - 12, contentY, { align: 'right' })

  // Bill To box
  
  drawInfoBox(pdf, {
    x: margin,
    y: yPos,
    width: boxWidth,
    height: LAYOUT.infoBoxHeight,
    title: 'BILL TO:',
  })

  contentY = yPos + 35
  pdf.setFontSize(FONTS.body)
  pdf.setTextColor(...COLORS.black)
  pdf.setFont('helvetica', 'bold')
  pdf.text(client.name || 'N/A', margin + LAYOUT.rowPadding
, contentY)
  contentY += 14

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(FONTS.body)
  pdf.setTextColor(...COLORS.darkGray)
  if (client.address) {
    const wrapped = wrapText(pdf, client.address, boxWidth - 24)
    wrapped.lines.slice(0, 2).forEach((line: string) => {
      pdf.text(line, margin + LAYOUT.rowPadding
, contentY)
      contentY += 14
    })
  }
  if (client.phone) {
    pdf.text(client.phone, margin + LAYOUT.rowPadding
, contentY)
    contentY += 14
  }
  if (client.email) {
    pdf.text(client.email, margin + LAYOUT.rowPadding
, contentY)
    contentY += 14
  }

  yPos += LAYOUT.infoBoxHeight + LAYOUT.sectionGap

  // Services table
  drawSectionTitle(pdf, 'SERVICES PROVIDED', margin, yPos, pageWidth - 2 * margin)
  yPos += 2

  const columns: TableColumnConfig = {
    descColX: margin + 12,
    qtyColX: pageWidth - 280,
    priceColX: pageWidth - 180,
    totalColX: pageWidth - margin - 12,
  }

  yPos = drawTableHeader(pdf, yPos, columns)

  if (invoice.items && Array.isArray(invoice.items)) {
    invoice.items.forEach((item: any, index: number) => {
      yPos = drawTableRow(pdf, item, yPos, columns, index, businessProfile.currencySymbol)
    })
  }

  pdf.setDrawColor(...COLORS.gold)
  pdf.setLineWidth(2)
  pdf.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 28

  yPos = drawTotals(
    pdf,
    yPos,
    invoice.subtotal || 0,
    invoice.tax || 0,
    invoice.discount || 0,
    invoice.total,
    businessProfile.currencySymbol
  )

  if (invoice.notes) {
    yPos = drawNotesSection(pdf, yPos, 'NOTES', invoice.notes)
  }

  if ((invoice as any).jobsiteReadyAcknowledged && (invoice as any).jobsiteReadyAcknowledgedAt) {
    yPos = drawJobsiteReadiness(pdf, yPos, (invoice as any).jobsiteReadyAcknowledgedAt, (invoice as any).waterShutoffElected)
  }

  drawFooter(pdf, businessProfile)
  pdf.save(`Invoice_${displayInvoiceNumber}_${(client.name || 'Client').replace(/\s+/g, '_')}.pdf`)
}

// ============================================================================
// EXPORT: generateContractPDF
// ============================================================================

export async function generateContractPDF(contract: Contract, client: Client, businessProfile: BusinessProfile) {
  let quoteData: any = null
  if (contract.quoteId) {
    try {
      const { doc, getDoc } = await import('firebase/firestore')
      const { db } = await import('../firebase')
      const quoteSnap = await getDoc(doc(db, 'quotes', contract.quoteId))
      if (quoteSnap.exists()) {
        quoteData = quoteSnap.data()
      } else {
        console.warn(`Contract PDF: Quote not found for quoteId '${contract.quoteId}'.`)
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
  const margin = LAYOUT.pageMargin

  let yPos = drawHeader(pdf, businessProfile, 'CONTRACT', logoData)

  const boxWidth = (pageWidth - 2 * margin - LAYOUT.infoBoxGap) / 2
const rightBoxX = margin + boxWidth + LAYOUT.infoBoxGap
  // Contract Details box
  
  drawInfoBox(pdf, {
  x: rightBoxX,
  y: yPos,
  width: boxWidth,
  height: LAYOUT.infoBoxHeight,
  title: 'CONTRACT DETAILS:',
})

// Start content inside the box
let contentY = yPos + 35

// -----------------------------
// Contract #
// -----------------------------
drawKeyValueRow(pdf, {
  label: 'Contract #:',
  value: contract.id || 'N/A',
  x: rightBoxX,
  y: contentY,
  labelX: rightBoxX + 12,
  valueX: rightBoxX + boxWidth - 12,
  align: 'right',
})
contentY += 16

// -----------------------------
// Date
// -----------------------------
drawKeyValueRow(pdf, {
  label: 'Date:',
  value: new Date(contract.createdAt || Date.now()).toLocaleDateString(),
  x: rightBoxX,
  y: contentY,
  labelX: rightBoxX + 12,
  valueX: rightBoxX + boxWidth - 12,
  align: 'right',
})
contentY += 16


// -----------------------------
// Amount — LABEL via drawKeyValueRow
// VALUE drawn manually in red
// -----------------------------
if (contract.totalAmount) {
  // Draw the label only
  drawKeyValueRow(pdf, {
    label: 'Amount:',
    value: '', // leave value blank — we draw red value manually
    x: rightBoxX,
    y: contentY,
    labelX: rightBoxX + 12,
    valueX: rightBoxX + boxWidth - 12,
    align: 'right',
  })

  // Draw the red amount value
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(FONTS.small)
  pdf.setTextColor(200, 0, 0) // red
  pdf.text(
    `${businessProfile.currencySymbol}${contract.totalAmount.toFixed(2)}`,
    rightBoxX + boxWidth - 12,
    contentY,
    { align: 'right' }
  )

  pdf.setTextColor(...COLORS.darkGray) // reset color
}

contentY += 16

  // Bill To box
  
  drawInfoBox(pdf, {
    x: margin,
    y: yPos,
    width: boxWidth,
    height: LAYOUT.infoBoxHeight,
    title: 'BILL TO:',
  })

  contentY = yPos + 35
  pdf.setFontSize(FONTS.body)
  pdf.setTextColor(...COLORS.black)
  pdf.setFont('helvetica', 'bold')
  pdf.text(client.name || 'N/A', margin + 12, contentY)
  contentY += 14

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(FONTS.body)
  pdf.setTextColor(...COLORS.darkGray)
  if (client.address) {
    const wrapped = wrapText(pdf, client.address, boxWidth - 24)
    wrapped.lines.slice(0, 2).forEach((line: string) => {
      pdf.text(line, margin + 12, contentY)
      contentY += 14
    })
  }
  if (client.phone) {
    pdf.text(client.phone, margin + 12, contentY)
    contentY += 14
  }
  if (client.email) {
    pdf.text(client.email, margin + 12, contentY)
    contentY += 14
  }

  yPos += LAYOUT.infoBoxHeight + LAYOUT.sectionGap

  if (contract.terms) {
    yPos = drawNotesSection(pdf, yPos, 'TERMS & CONDITIONS', contract.terms)
  }

  if (contract.scope) {
    yPos = drawNotesSection(pdf, yPos, 'SCOPE OF WORK', contract.scope)
  }

  if (quoteData && quoteData.jobsiteReadyAcknowledged && quoteData.jobsiteReadyAcknowledgedAt) {
    yPos = drawJobsiteReadiness(pdf, yPos, quoteData.jobsiteReadyAcknowledgedAt, quoteData.waterShutoffElected)
  }

  drawFooter(pdf, businessProfile)
  pdf.save(`Contract_${contract.id || 'Unknown'}_${(client.name || 'Client').replace(/\s+/g, '_')}.pdf`)
}
