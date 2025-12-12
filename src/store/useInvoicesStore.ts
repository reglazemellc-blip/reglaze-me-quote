/**
 * useInvoicesStore
 * 
 * Manages invoices with Firestore sync.
 * Invoices are created from quotes and track payment status.
 */

import { create } from 'zustand'
import { collection, doc, getDocs, setDoc, deleteDoc, query, where } from 'firebase/firestore'
import { db as firestoreDb } from '../firebase'
import type { Invoice, InvoiceStatus } from '@db/index'
import { useConfigStore } from '@store/useConfigStore'


type InvoicesState = {
  invoices: Invoice[]
  loading: boolean

  // Load all invoices
  init: () => Promise<void>

  // Create or update invoice
  upsert: (invoice: Invoice) => Promise<void>

  // Delete invoice
  remove: (id: string) => Promise<void>

  // Record payment
  recordPayment: (id: string, amount: number) => Promise<void>

  // Get invoices by client
  getByClient: (clientId: string) => Invoice[]

  // Get invoice by quote
  getByQuote: (quoteId: string) => Invoice | undefined
}

const invoicesCol = collection(firestoreDb, 'invoices')

export const useInvoicesStore = create<InvoicesState>((set, get) => ({
  invoices: [],
  loading: true,

  // ==================== INIT ====================
 init: async () => {
  const snap = await getDocs(invoicesCol)
  const tenantId = useConfigStore.getState().activeTenantId
  const invoices = snap.docs
    .map((d) => ({ ...(d.data() as Invoice), id: d.id, tenantId: (d.data() as any).tenantId ?? '' }))
    .filter((inv) => inv.tenantId === tenantId)
  set({ invoices, loading: false })
},

  // ==================== UPSERT ====================
 upsert: async (invoice) => {
  const ref = doc(invoicesCol, invoice.id)
  await setDoc(
    ref,
    { ...invoice, tenantId: useConfigStore.getState().activeTenantId },
    { merge: true }
  )


    // Reload
    const tenantId = useConfigStore.getState().activeTenantId
const snap = await getDocs(invoicesCol)

    const invoices = snap.docs
  .map((d) => ({ ...(d.data() as Invoice), id: d.id }))
  .filter((inv) => inv.tenantId === tenantId)

    set({ invoices })
  },

  // ==================== REMOVE ====================
 remove: async (id) => {
  await deleteDoc(doc(invoicesCol, id))

  const tenantId = useConfigStore.getState().activeTenantId
  const snap = await getDocs(invoicesCol)
  const invoices = snap.docs
    .map((d) => ({ ...(d.data() as Invoice), id: d.id }))
    .filter((inv) => inv.tenantId === tenantId)

  set({ invoices })
},


  // ==================== RECORD PAYMENT ====================
  recordPayment: async (id, amount) => {
    const invoice = get().invoices.find((i) => i.id === id)
    if (!invoice) return

    const newAmountPaid = invoice.amountPaid + amount
    let newStatus: InvoiceStatus = 'unpaid'

    if (newAmountPaid >= invoice.total) {
      newStatus = 'paid'
    } else if (newAmountPaid > 0) {
      newStatus = 'partial'
    }

    const updated: Invoice = {
      ...invoice,
      amountPaid: newAmountPaid,
      status: newStatus,
      updatedAt: Date.now(),
    }

    await get().upsert(updated)
  },

  // ==================== HELPERS ====================
  getByClient: (clientId) => {
    return get().invoices.filter((i) => i.clientId === clientId)
  },

  getByQuote: (quoteId) => {
    return get().invoices.find((i) => i.quoteId === quoteId)
  },
}))
