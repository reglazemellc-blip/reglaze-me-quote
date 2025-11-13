import type { LineItem } from '@db/index'

export function formatCurrency(n: number) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n || 0)
}

export function formatQuoteId(d: Date, seq: number) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `q-${yyyy}${mm}${dd}-${String(seq).padStart(4, '0')}`
}

export function computeItem(li: LineItem): LineItem {
  return { ...li, total: round2((li.qty || 0) * (li.unitPrice || 0)) }
}

export function sumItems(items: LineItem[], taxRate: number, discount: number) {
  const subtotal = round2(items.reduce((acc, it) => acc + (it.total || 0), 0))
  const tax = round2(subtotal * (taxRate || 0))
  const total = round2(subtotal + tax - (discount || 0))
  return { subtotal, tax, total }
}

export function round2(n: number) { return Math.round((n + Number.EPSILON) * 100) / 100 }

