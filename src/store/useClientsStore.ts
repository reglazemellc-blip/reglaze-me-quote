// -------------------------------------------------------------
// useClientsStore.ts  (UPGRADED FOR NEW DATABASE TYPES)
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
}

const clientsCol = collection(db, 'clients')
const quotesCol = collection(db, 'quotes')

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
}))
