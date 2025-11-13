import { create } from 'zustand'
import { db, type Quote, type LineItem, getOrInitSettings } from '@db/index'
import { formatQuoteId, sumItems } from '@utils/quote'

type QuotesState = {
  quotes: Quote[]
  loading: boolean
  init: () => Promise<void>
  upsert: (q: Quote) => Promise<Quote>
  byClient: (clientId: string) => Quote[]
  search: (term: string) => Quote[]
  remove: (id: string) => Promise<void>
}

export const useQuotesStore = create<QuotesState>((set, get) => ({
  quotes: [],
  loading: true,
  init: async () => {
    const quotes = await db.quotes.orderBy('createdAt').toArray()
    set({ quotes, loading: false })
  },
  upsert: async (q) => {
    const now = Date.now()
    if (!q.id) {
      const settings = await getOrInitSettings()
      const seq = (settings.nextSequence ?? 1)
      const id = formatQuoteId(new Date(), seq)
      q.id = id
      await db.settings.put({ ...settings, nextSequence: seq + 1 })
      q.createdAt = now
    }
    const totals = sumItems(q.items, q.taxRate, q.discount)
    const toSave: Quote = { ...q, ...totals, updatedAt: now }
    await db.quotes.put(toSave)
    const quotes = await db.quotes.orderBy('createdAt').toArray()
    set({ quotes })
    return toSave
  },
  byClient: (clientId) => get().quotes.filter(q => q.clientId === clientId),
  search: (term) => {
    const q = term.toLowerCase()
    return get().quotes.filter(x => x.id.toLowerCase().includes(q) || (x.notes ?? '').toLowerCase().includes(q))
  },
  remove: async (id) => {
    await db.quotes.delete(id)
    const quotes = await db.quotes.orderBy('createdAt').toArray()
    set({ quotes })
  }
}))
