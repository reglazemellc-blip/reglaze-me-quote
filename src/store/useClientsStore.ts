import { create } from 'zustand'
import { db, type Client } from '@db/index'

type ClientsState = {
  clients: Client[]
  loading: boolean
  init: () => Promise<void>
  upsert: (c: Client) => Promise<void>
  create: (partial?: Partial<Client>) => Promise<Client>
  remove: (id: string) => Promise<void>
  search: (term: string) => Client[]
}

export const useClientsStore = create<ClientsState>((set, get) => ({
  clients: [],
  loading: true,
  init: async () => {
    const clients = await db.clients.orderBy('createdAt').toArray()
    set({ clients, loading: false })
  },
  upsert: async (c) => {
    c.updatedAt = Date.now()
    if (!c.createdAt) c.createdAt = Date.now()
    await db.clients.put(c)
    const clients = await db.clients.orderBy('createdAt').toArray()
    set({ clients })
  },
  create: async (partial) => {
    const now = Date.now()
    const c: Client = {
      id: crypto.randomUUID(),
      name: partial?.name || 'New Client',
      phone: partial?.phone,
      email: partial?.email,
      address: partial?.address,
      notes: partial?.notes,
      photos: [],
      createdAt: now,
      updatedAt: now,
    }
    await db.clients.add(c)
    const clients = await db.clients.orderBy('createdAt').toArray()
    set({ clients })
    return c
  },
  remove: async (id) => {
    // also delete quotes for this client
    await db.transaction('rw', db.clients, db.quotes, async () => {
      await db.clients.delete(id)
      const toDelete = await db.quotes.where('clientId').equals(id).primaryKeys()
      if (toDelete.length) await db.quotes.bulkDelete(toDelete as string[])
    })
    const clients = await db.clients.orderBy('createdAt').toArray()
    set({ clients })
  },
  search: (term) => {
    const q = term.toLowerCase()
    return get().clients.filter(c =>
      [c.name, c.phone, c.email, c.address].filter(Boolean).some(v => v!.toLowerCase().includes(q))
    )
  }
}))
