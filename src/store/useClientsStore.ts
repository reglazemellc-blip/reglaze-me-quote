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
import type { Client } from '@db/index'

type ClientsState = {
  clients: Client[]
  loading: boolean
  init: () => Promise<void>
  upsert: (c: Client) => Promise<void>
  create: (partial?: Partial<Client>) => Promise<Client>
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
    const clients = snap.docs.map((d) => {
      const data = d.data() as Client
      return { ...data, id: d.id }
    })
    set({ clients, loading: false })
  },

  // -------------------------------------------------
  // UPSERT CLIENT (FIXED: No undefined fields)
  // -------------------------------------------------
  upsert: async (c) => {
    const now = Date.now()
    const updated: Client = {
      ...c,
      phone: c.phone || '',
      email: c.email || '',
      address: c.address || '',
      notes: c.notes || '',
      updatedAt: now,
      createdAt: c.createdAt ?? now,
    }

    await setDoc(doc(clientsCol, updated.id), updated)

    const snap = await getDocs(clientsCol)
    const clients = snap.docs.map((d) => ({
      ...(d.data() as Client),
      id: d.id,
    }))
    set({ clients })
  },

  // -------------------------------------------------
  // CREATE CLIENT (FIXED: No undefined fields)
  // -------------------------------------------------
  create: async (partial) => {
    const now = Date.now()

    const newClient: Client = {
      id: crypto.randomUUID(),
      name: partial?.name || 'New Client',
      phone: partial?.phone || '',
      email: partial?.email || '',
      address: partial?.address || '',
      notes: partial?.notes || '',
      photos: [],
      createdAt: now,
      updatedAt: now,
    }

    await setDoc(doc(clientsCol, newClient.id), newClient)

    const snap = await getDocs(clientsCol)
    const clients = snap.docs.map((d) => ({
      ...(d.data() as Client),
      id: d.id,
    }))
    set({ clients })

    return newClient
  },

  // -------------------------------------------------
  // REMOVE CLIENT + THEIR QUOTES
  // -------------------------------------------------
  remove: async (id) => {
    await deleteDoc(doc(clientsCol, id))

    const qSnap = await getDocs(query(quotesCol, where('clientId', '==', id)))
    const deletes = qSnap.docs.map((d) => deleteDoc(doc(quotesCol, d.id)))
    await Promise.all(deletes)

    const snap = await getDocs(clientsCol)
    const clients = snap.docs.map((d) => ({
      ...(d.data() as Client),
      id: d.id,
    }))
    set({ clients })
  },

  // -------------------------------------------------
  // SEARCH
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
