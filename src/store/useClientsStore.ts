// -------------------------------------------------------------
// useClientsStore.ts  (UPGRADED FOR NEW DATABASE TYPES + REMINDERS)
// -------------------------------------------------------------

import { create } from 'zustand'
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

type ClientsState = {
  clients: Client[]
  loading: boolean

  init: () => Promise<void>
  upsert: (c: Partial<Client>) => Promise<Client>
  remove: (id: string) => Promise<void>
  search: (term: string) => Client[]

  // NEW: Reminder helpers (kept simple & safe)
  addReminder: (input: {
    clientId: string
    remindAt: number
    note?: string
    quoteId?: string
    snoozeDays?: number
  }) => Promise<Reminder | null>

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

export const useClientsStore = create<ClientsState>((set, get) => ({
  clients: [],
  loading: true,

  // -------------------------------------------------
  // LOAD ALL CLIENTS
  // -------------------------------------------------
  init: async () => {
    const snap = await getDocs(clientsCol)

    const clients: Client[] = snap.docs.map((d) => ({
      ...(d.data() as Client),
      id: d.id,

      // guaranteed defaults so nothing crashes
      photos: d.data().photos ?? [],
      attachments: d.data().attachments ?? [],
      conversations: d.data().conversations ?? [],
      reminders: d.data().reminders ?? [],
    }))

    set({ clients, loading: false })
  },

  // -------------------------------------------------
  // CREATE / UPDATE CLIENT
  // -------------------------------------------------
  upsert: async (c) => {
    const now = Date.now()

    const clean: Client = {
      // required
      id: c.id!,
      name: c.name ?? '',
      phone: c.phone ?? '',
      email: c.email ?? '',
      address: c.address ?? '',
      notes: c.notes ?? '',

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
    const snap = await getDocs(clientsCol)
    const clients: Client[] = snap.docs.map((d) => ({
      ...(d.data() as Client),
      id: d.id,
      photos: d.data().photos ?? [],
      attachments: d.data().attachments ?? [],
      conversations: d.data().conversations ?? [],
      reminders: d.data().reminders ?? [],
    }))

    set({ clients })

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
    const snap = await getDocs(clientsCol)
    const clients: Client[] = snap.docs.map((d) => ({
      ...(d.data() as Client),
      id: d.id,
      photos: d.data().photos ?? [],
      attachments: d.data().attachments ?? [],
      conversations: d.data().conversations ?? [],
      reminders: d.data().reminders ?? [],
    }))

    set({ clients })
  },

  // -------------------------------------------------
  // SEARCH CLIENTS
  // -------------------------------------------------
  search: (term) => {
    const q = term.toLowerCase()
    return get().clients.filter((c) =>
      [c.name, c.phone, c.email, c.address]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q))
    )
  },

  // -------------------------------------------------
  // REMINDERS — ADD
  // -------------------------------------------------
  addReminder: async ({ clientId, remindAt, note, quoteId, snoozeDays }) => {
    const state = get()
    const client = state.clients.find((c) => c.id === clientId)
    if (!client) return null

    const now = Date.now()
    const reminder: Reminder = {
      id: createId(),
      clientId,
      quoteId,
      remindAt,
      snoozeDays,
      done: false,
      note: note ?? '',
    }

    const current = client.reminders ?? []
    const updatedReminders: Reminder[] = [...current, reminder]

    await updateDoc(doc(clientsCol, clientId), {
      reminders: updatedReminders,
      updatedAt: now,
    })

    // update local state
    const updatedClients = state.clients.map((c) =>
      c.id === clientId ? { ...c, reminders: updatedReminders, updatedAt: now } : c
    )

    set({ clients: updatedClients })

    return reminder
  },

  // -------------------------------------------------
  // REMINDERS — UPDATE
  // -------------------------------------------------
  updateReminder: async ({ clientId, reminderId, patch }) => {
    const state = get()
    const client = state.clients.find((c) => c.id === clientId)
    if (!client) return null

    const current = client.reminders ?? []
    let updatedReminder: Reminder | null = null

    const updatedReminders: Reminder[] = current.map((r) => {
      if (r.id !== reminderId) return r
      const merged: Reminder = {
        ...r,
        ...patch,
      }
      updatedReminder = merged
      return merged
    })

    if (!updatedReminder) return null

    const now = Date.now()
    await updateDoc(doc(clientsCol, clientId), {
      reminders: updatedReminders,
      updatedAt: now,
    })

    const updatedClients = state.clients.map((c) =>
      c.id === clientId ? { ...c, reminders: updatedReminders, updatedAt: now } : c
    )

    set({ clients: updatedClients })

    return updatedReminder
  },

  // -------------------------------------------------
  // REMINDERS — DELETE
  // -------------------------------------------------
  deleteReminder: async ({ clientId, reminderId }) => {
    const state = get()
    const client = state.clients.find((c) => c.id === clientId)
    if (!client) return

    const current = client.reminders ?? []
    const updatedReminders = current.filter((r) => r.id !== reminderId)
    const now = Date.now()

    await updateDoc(doc(clientsCol, clientId), {
      reminders: updatedReminders,
      updatedAt: now,
    })

    const updatedClients = state.clients.map((c) =>
      c.id === clientId ? { ...c, reminders: updatedReminders, updatedAt: now } : c
    )

    set({ clients: updatedClients })
  },
}))
