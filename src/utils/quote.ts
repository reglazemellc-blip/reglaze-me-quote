// -------------------------------------------------------------
// quote.ts  (FINAL VERSION)
// -------------------------------------------------------------

import type { LineItem } from '@db/index'

// Round helper
export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// Compute total for a single line item
export function computeItem(li: LineItem): LineItem {
  return {
    ...li,
    total: round2((li.qty || 0) * (li.unitPrice || 0)),
  }
}

// Sum items (subtotal only — tax/discount handled in editor or store)
export function sumItems(items: LineItem[]) {
  const computed = items.map(computeItem)
  const subtotal = computed.reduce((acc, li) => acc + (li.total || 0), 0)

  return round2(subtotal)
}

// Format Quote ID
export function formatQuoteId(d: Date, seq: number) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `q-${yyyy}${mm}${dd}-${String(seq).padStart(4, '0')}`
}
