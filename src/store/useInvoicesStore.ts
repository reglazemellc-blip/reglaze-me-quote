// -------------------------------------------------------------
// useClientsStore.ts  (UPGRADED FOR NEW DATABASE TYPES + REMINDERS)
// -------------------------------------------------------------

import { create } from 'zustand'
import { useConfigStore } from '@store/useConfigStore'
import { auth } from '../firebase'


import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import type {
  Client,
  Attachment,
  ConversationEntry,
  Reminder,
  Invoice,
} from '@db/index'


type InvoicesState = {
  invoices: Invoice[]
  loading: boolean

  init: () => Promise<void>
  getByQuote: (quoteId: string) => Invoice | undefined
    upsertInvoice: (invoice: Partial<Invoice>) => Promise<Invoice>
      recordPayment: (invoiceId: string, amount: number) => Promise<void>

  upsert: (c: Partial<Client>) => Promise<Client>
  remove: (id: string) => Promise<void>
}


const clientsCol = collection(db, 'clients')
const quotesCol = collection(db, 'quotes')

// simple id helper (no dependency on crypto)
function createId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2)}`
}

export const useInvoicesStore = create<InvoicesState>((set, get) => ({
        invoices: [],
  loading: true,
      getByQuote: (quoteId: string) => {
    return get().invoices.find((i) => i.quoteId === quoteId)
  },


      upsertInvoice: async (invoice) => {
    let tenantId = useConfigStore.getState().activeTenantId

    // ⏳ HARD WAIT for tenantId (write-safe)
    if (!tenantId) {
      await new Promise<void>((resolve) => {
        const unsub = useConfigStore.subscribe((state) => {
          if (state.activeTenantId) {
            tenantId = state.activeTenantId
            unsub()
            resolve()
          }
        })
      })
    }

    if (!tenantId) {
      throw new Error('tenantId missing during invoice upsert')
    }

    // prevent duplicate invoice for same quote
    if (invoice.quoteId) {
      const existing = get().invoices.find(
        (i) => i.quoteId === invoice.quoteId
      )
      if (existing) {
        return existing
      }
    }

    const now = Date.now()

    const clean: Invoice = {
      id: invoice.id ?? `${now}_${Math.random().toString(36).slice(2)}`,
      tenantId,

      clientId: invoice.clientId!,
      quoteId: invoice.quoteId,

      total: invoice.total ?? 0,
      amountPaid: invoice.amountPaid ?? 0,
      status: invoice.status ?? 'unpaid',

      ...(invoice.dueDate !== undefined ? { dueDate: invoice.dueDate } : {}),
      ...(invoice.notes !== undefined ? { notes: invoice.notes } : {}),
      ...(Array.isArray(invoice.attachments)
  ? { attachments: invoice.attachments.filter(Boolean) }
  : {}),



      createdAt: invoice.createdAt ?? now,
      updatedAt: now,
    }

    await setDoc(doc(collection(db, 'invoices'), clean.id), clean)

    // refresh invoices (read-only reload)
    const snap = await getDocs(
      query(collection(db, 'invoices'), where('tenantId', '==', tenantId))
    )

    const invoices: Invoice[] = snap.docs.map((d) => ({
      ...(d.data() as Invoice),
      id: d.id,
    }))

    set({ invoices })

    return clean
  },


    recordPayment: async () => {
    throw new Error('Invoice payment recording not implemented yet')
  },


    upsert: async () => {
    throw new Error('Invoice upsert not implemented yet')
  },


  // -------------------------------------------------
  // LOAD ALL CLIENTS
  // -------------------------------------------------
// -------------------------------------------------
// LOAD ALL CLIENTS (WAIT FOR TENANT)
// -------------------------------------------------
// -------------------------------------------------
// LOAD ALL CLIENTS (WAIT FOR TENANT, THEN LOAD)
// -------------------------------------------------
init: async () => {
  if (!auth.currentUser) {
    set({ invoices: [], loading: false })
    return
  }

  let tenantId = useConfigStore.getState().activeTenantId

  // ⏳ HARD WAIT for tenantId (cold reload safe)
  if (!tenantId) {
    await new Promise<void>((resolve) => {
      const unsub = useConfigStore.subscribe((state) => {
        if (state.activeTenantId) {
          tenantId = state.activeTenantId
          unsub()
          resolve()
        }
      })
    })
  }

  if (!tenantId) {
    set({ invoices: [], loading: false })
    return
  }

  const snap = await getDocs(
    query(collection(db, 'invoices'), where('tenantId', '==', tenantId))
  )

  const invoices: Invoice[] = snap.docs.map((d) => ({
    ...(d.data() as Invoice),
    id: d.id,
  }))

  set({ invoices, loading: false })
},



  // -------------------------------------------------
  // REMOVE CLIENT + THEIR QUOTES
  // -------------------------------------------------
  
  remove: async () => {
  throw new Error('Invoice remove not implemented yet')
},


 

})); // <-- closes create<InvoicesState>((set, get) => ({
  
