import { create } from 'zustand'
import {
  collection,
  doc,
  getDocs,
  query,
  orderBy,
  setDoc,
  deleteDoc
} from 'firebase/firestore'
import { db } from '../firebase'
import { formatQuoteId, sumItems } from '@utils/quote'
import { getOrInitSettings } from '@db/index'
import type { Quote } from '@db/index'

type QuotesState = {
  quotes: Quote[]
  loading: boolean
  init: () => Promise<void>
  upsert: (q: Quote) => Promise<Quote>
  byClient: (clientId: string) => Quote[]
  search: (term: string) => Quote[]
  remove: (id: string) => Promise<void>
}

const quotesCol = collection(db, 'quotes')

export const useQuotesStore = create<QuotesState>((set, get) => ({
  quotes: [],
  loading: true,

  // Load all quotes
  init: async () => {
    const qSnap = await getDocs(query(quotesCol, orderBy('createdAt')))

    const quotes = qSnap.docs.map(d => {
      const data = d.data() as Quote

      return {
        ...data,
        id: d.id,
        clientName: data.clientName || "Unnamed" // ⭐ Ensure always present
      }
    })

    set({ quotes, loading: false })
  },

  // Create/update quote
  upsert: async (q) => {
    const now = Date.now()

    // Create ID if new
    if (!q.id) {
      const settings = await getOrInitSettings()
      const seq = settings.nextSequence ?? 1
      const newId = formatQuoteId(new Date(), seq)

      q.id = newId
      q.createdAt = now

      await setDoc(doc(db, 'settings', 'settings'), {
        ...settings,
        nextSequence: seq + 1
      })
    }

    // Ensure totals
    const totals = sumItems(q.items, q.taxRate, q.discount)

    const toSave: Quote = {
      ...q,
      ...totals,
      clientName: q.clientName || "Unnamed", // ⭐ Save clientName always
      updatedAt: now
    }

    await setDoc(doc(quotesCol, toSave.id), toSave)

    // Reload all quotes
    const qSnap = await getDocs(query(quotesCol, orderBy('createdAt')))
    const quotes = qSnap.docs.map(d => {
      const data = d.data() as Quote

      return {
        ...data,
        id: d.id,
        clientName: data.clientName || "Unnamed" // ⭐ Ensure always present
      }
    })

    set({ quotes })

    return toSave
  },

  // Filter quotes by clientId
  byClient: (clientId) => {
    return get().quotes.filter(q => q.clientId === clientId)
  },

  // Search
  search: (term) => {
    const t = term.toLowerCase()
    return get().quotes.filter(q =>
      q.id.toLowerCase().includes(t) ||
      (q.clientName ?? '').toLowerCase().includes(t) || // ⭐ search by client
      (q.notes ?? '').toLowerCase().includes(t)
    )
  },

  // Delete quote
  remove: async (id) => {
    await deleteDoc(doc(quotesCol, id))

    const qSnap = await getDocs(query(quotesCol, orderBy('createdAt')))
    const quotes = qSnap.docs.map(d => {
      const data = d.data() as Quote

      return {
        ...data,
        id: d.id,
        clientName: data.clientName || "Unnamed" // ⭐ Ensure always present
      }
    })

    set({ quotes })
  }
}))
