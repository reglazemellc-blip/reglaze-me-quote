// -------------------------------------------------------------
// useInvoicesStore.ts
// -------------------------------------------------------------
// Store for managing invoices in the application
// -------------------------------------------------------------

import { create } from 'zustand'
import { useConfigStore } from '@store/useConfigStore'
import { auth } from '../firebase'


import {
  doc,
  collection,
  query,
  where,
  getDoc,
  getDocs,
  updateDoc,
  setDoc,
  deleteDoc,
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
        if (!invoice.id && invoice.quoteId) {

      const existing = get().invoices.find(
        (i) => i.quoteId === invoice.quoteId
      )
      if (existing) {
        return existing
      }
    }

    const now = Date.now()
    const existing =
      invoice.id
        ? get().invoices.find((i) => i.id === invoice.id)
        : undefined

    const clean: Invoice = {
      id: invoice.id ?? `${now}_${Math.random().toString(36).slice(2)}`,
      tenantId,

            clientId: invoice.clientId ?? existing?.clientId!,
            quoteId: invoice.quoteId ?? existing?.quoteId,
            invoiceNumber: invoice.invoiceNumber ?? existing?.invoiceNumber,



            total: invoice.total ?? existing?.total ?? 0,
      amountPaid: invoice.amountPaid ?? existing?.amountPaid ?? 0,
      status: invoice.status ?? existing?.status ?? 'unpaid',


      ...(invoice.dueDate !== undefined ? { dueDate: invoice.dueDate } : {}),
      ...(invoice.notes !== undefined ? { notes: invoice.notes } : {}),
      ...(Array.isArray(invoice.attachments)
  ? { attachments: invoice.attachments.filter(Boolean) }
  : {}),



      createdAt: invoice.createdAt ?? now,
      updatedAt: now,
    }

    try {
      await setDoc(doc(collection(db, 'invoices'), clean.id), clean)

      set({
        invoices: (() => {
          const current = get().invoices
          const index = current.findIndex((i) => i.id === clean.id)
          if (index === -1) return [...current, clean]
          return current.map((i) => (i.id === clean.id ? clean : i))
        })(),
      })

      return clean
    } catch (error) {
      console.error('Failed to save invoice:', error);
      throw new Error('Failed to save invoice. Please check your connection and try again.');
    }
  },


   recordPayment: async (id: string, amount: number) => {
  if (amount <= 0) return

  const tenantId = useConfigStore.getState().activeTenantId
  if (!tenantId) {
    throw new Error('tenantId missing during invoice payment')
  }

  const invoiceRef = doc(collection(db, 'invoices'), id)

  // load current invoice
  const snap = await getDoc(invoiceRef)
  if (!snap.exists()) {
    throw new Error('Invoice not found')
  }

  const data = snap.data() as any

  const prevPaid = typeof data.amountPaid === 'number' ? data.amountPaid : 0
  const total = typeof data.total === 'number' ? data.total : 0

  const nextPaid = prevPaid + amount

  let nextStatus: 'unpaid' | 'partial' | 'paid' = 'unpaid'
  if (nextPaid >= total) {
    nextStatus = 'paid'
  } else if (nextPaid > 0) {
    nextStatus = 'partial'
  }

  await updateDoc(invoiceRef, {
    amountPaid: nextPaid,
    status: nextStatus,
    updatedAt: Date.now(),
    tenantId,
  })

  // update local store copy
  const invoices = get().invoices as any[]
  set({
    invoices: invoices.map((inv) =>
      inv.id === id
        ? {
            ...inv,
            amountPaid: nextPaid,
            status: nextStatus,
            updatedAt: Date.now(),
          }
        : inv
    ),
  })
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
  // REMOVE INVOICE
  // -------------------------------------------------

  remove: async (id: string) => {
    try {
      await deleteDoc(doc(collection(db, 'invoices'), id))

      set({
        invoices: get().invoices.filter((i) => i.id !== id)
      })
    } catch (error) {
      console.error('Failed to delete invoice:', error);
      throw new Error('Failed to delete invoice. Please check your connection and try again.');
    }
},


 

})); // <-- closes create<InvoicesState>((set, get) => ({
  
