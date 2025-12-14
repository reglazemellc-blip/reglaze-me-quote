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
} from '@db/index'

type InvoicesState = {
  invoices: any[]
  loading: boolean

  init: () => Promise<void>
  upsert: (c: Partial<Client>) => Promise<Client>
  remove: (id: string) => Promise<void>


  

  updateReminder: (input: {
    clientId: string
    reminderId: string
    patch: Partial<Reminder>
  }) => Promise<Reminder | null>

  deleteReminder: (input: {
    clientId: string
    reminderId: string
  }) => Promise<void>
}

const clientsCol = collection(db, 'clients')
const quotesCol = collection(db, 'quotes')

// simple id helper (no dependency on crypto)
function createId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2)}`
}

export const useInvoicesStore = create<InvoicesState>((set, get) => ({
      invoices: [] as any[],
  loading: true,

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
    set({ loading: false })
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

    // ✅ Use tenantId resolved by hard wait
  if (!tenantId) {
  console.warn('[clients.init] tenantId missing — waiting to retry')

  // retry once tenant becomes available
  useConfigStore.subscribe((state) => {
    if (state.activeTenantId) {
      get().init()
    }
  })

  return
}




  const snap = await getDocs(
    query(clientsCol, where('tenantId', '==', tenantId))
  )

  const clients: Client[] = snap.docs.map((d) => ({
    ...(d.data() as Client),
    id: d.id,
    tenantId: d.data().tenantId ?? '',
    photos: d.data().photos ?? [],
    attachments: d.data().attachments ?? [],
    conversations: d.data().conversations ?? [],
    reminders: d.data().reminders ?? [],
    status: (d.data() as any).status ?? 'new',

  }))

  set({ invoices: clients, loading: false })

},
  

  // -------------------------------------------------
  // CREATE / UPDATE CLIENT
  // -------------------------------------------------
    upsert: async (c) => {
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
      console.warn('[clients.upsert] aborted — tenantId missing')
      throw new Error('tenantId missing during client upsert')
    }

    const now = Date.now()

    const clean: Client = {
      // required
      id: c.id!,
      tenantId,
      name: c.name ?? '',
      phone: c.phone ?? '',
      email: c.email ?? '',
      address: c.address ?? '',
      notes: c.notes ?? '',
      status: (c as any).status ?? 'new',


      // NEW FIELDS - safe defaults
      photos: c.photos ?? [],
      attachments: c.attachments ?? [],
      conversations: c.conversations ?? [],
      reminders: c.reminders ?? [],

      createdAt: c.createdAt ?? now,
      updatedAt: now,
    }

    await setDoc(doc(clientsCol, clean.id), clean)

    // reload clients
    // tenantId already resolved above

const snap = await getDocs(query(clientsCol, where('tenantId', '==', tenantId)))

    const clients: Client[] = snap.docs.map((d) => ({
      ...(d.data() as Client),
      id: d.id,
      photos: d.data().photos ?? [],
      attachments: d.data().attachments ?? [],
      conversations: d.data().conversations ?? [],
      reminders: d.data().reminders ?? [],
      status: (d.data() as any).status ?? 'new',

    }))

    set({ invoices: clients })


    return clean
  },

  // -------------------------------------------------
  // REMOVE CLIENT + THEIR QUOTES
  // -------------------------------------------------
  remove: async (id) => {
    await deleteDoc(doc(clientsCol, id))

    // delete quotes belonging to client
    const qSnap = await getDocs(query(quotesCol, where('clientId', '==', id)))
    const deletes = qSnap.docs.map((d) => deleteDoc(doc(quotesCol, d.id)))
    await Promise.all(deletes)

    // reload
    const tenantId = useConfigStore.getState().activeTenantId
const snap = await getDocs(query(clientsCol, where('tenantId', '==', tenantId)))
    const clients: Client[] = snap.docs.map((d) => ({
      ...(d.data() as Client),
      id: d.id,
      photos: d.data().photos ?? [],
      attachments: d.data().attachments ?? [],
      conversations: d.data().conversations ?? [],
      reminders: d.data().reminders ?? [],
      status: (d.data() as any).status ?? 'new',

    }))

     set({ invoices: clients })
  
    },
  
   


  // -------------------------------------------------
  // ADD REMINDER
  // -------------------------------------------------
 
  // -------------------------------------------------
  // UPDATE REMINDER
  // -------------------------------------------------
  updateReminder: async ({ clientId, reminderId, patch }) => {
    const clientRef = doc(clientsCol, clientId)
    const clientSnap = await getDocs(query(clientsCol, where('id', '==', clientId)))
    if (clientSnap.empty) return null
    const clientData = clientSnap.docs[0].data() as Client
    const reminders = (clientData.reminders ?? []).map((reminder: Reminder) =>
      reminder.id === reminderId ? { ...reminder, ...patch, updatedAt: Date.now() } : reminder
    )
    await updateDoc(clientRef, { reminders })
    await get().init()
    return reminders.find((r: Reminder) => r.id === reminderId) ?? null
  },

  // -------------------------------------------------
  // DELETE REMINDER
  // -------------------------------------------------
  deleteReminder: async ({ clientId, reminderId }) => {
    const clientRef = doc(clientsCol, clientId)
    const clientSnap = await getDocs(query(clientsCol, where('id', '==', clientId)))
    if (clientSnap.empty) return
    const clientData = clientSnap.docs[0].data() as Client
    const reminders = (clientData.reminders ?? []).filter((reminder: Reminder) => reminder.id !== reminderId)
    await updateDoc(clientRef, { reminders })
    await get().init()
  }

})); // <-- closes create<InvoicesState>((set, get) => ({
  
