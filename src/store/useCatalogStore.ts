import { create } from 'zustand'
import {
  collection,
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { ServiceCatalog } from '@db/index'

type CatalogState = {
  catalog: ServiceCatalog | null
  loading: boolean
  init: () => Promise<void>

  addService: (name: string) => Promise<void>
  updateService: (serviceId: string, name: string) => Promise<void>
  removeService: (serviceId: string) => Promise<void>

  addSubservice: (
    serviceId: string,
    payload: { name: string; warning?: string }
  ) => Promise<void>
  updateSubservice: (
    serviceId: string,
    subId: string,
    payload: { name?: string; warning?: string }
  ) => Promise<void>
  removeSubservice: (serviceId: string, subId: string) => Promise<void>
}

const catalogCol = collection(db, 'catalog')
const catalogDocRef = doc(catalogCol, 'catalog')

async function loadOrCreateDefaultCatalog(): Promise<ServiceCatalog> {
  const snap = await getDoc(catalogDocRef)
  if (snap.exists()) {
    return snap.data() as ServiceCatalog
  }

  const empty: ServiceCatalog = {
    id: 'catalog',
    services: [],
  }

  await setDoc(catalogDocRef, empty)
  return empty
}

export const useCatalogStore = create<CatalogState>((set, get) => ({
  catalog: null,
  loading: true,

  // ---------------------------
  // INIT
  // ---------------------------
  init: async () => {
    const catalog = await loadOrCreateDefaultCatalog()
    set({ catalog, loading: false })
  },

  // ---------------------------
  // SERVICE OPERATIONS
  // ---------------------------
  addService: async (name) => {
    const state = get()
    const current = state.catalog ?? (await loadOrCreateDefaultCatalog())

    const newService = {
      id: crypto.randomUUID(),
      name,
      subservices: [] as { id: string; name: string; warning?: string }[],
    }

    const next: ServiceCatalog = {
      ...current,
      services: [...current.services, newService],
    }

    await setDoc(catalogDocRef, next)
    set({ catalog: next })
  },

  updateService: async (serviceId, name) => {
    const state = get()
    const current = state.catalog ?? (await loadOrCreateDefaultCatalog())

    const nextServices = current.services.map((s) =>
      s.id === serviceId ? { ...s, name } : s
    )

    const next: ServiceCatalog = { ...current, services: nextServices }
    await setDoc(catalogDocRef, next)
    set({ catalog: next })
  },

  removeService: async (serviceId) => {
    const state = get()
    const current = state.catalog ?? (await loadOrCreateDefaultCatalog())

    const nextServices = current.services.filter((s) => s.id !== serviceId)

    const next: ServiceCatalog = { ...current, services: nextServices }
    await setDoc(catalogDocRef, next)
    set({ catalog: next })
  },

  // ---------------------------
  // SUBSERVICE OPERATIONS
  // ---------------------------
  addSubservice: async (serviceId, payload) => {
    const state = get()
    const current = state.catalog ?? (await loadOrCreateDefaultCatalog())

    const nextServices = current.services.map((s) => {
      if (s.id !== serviceId) return s
      const newSub = {
        id: crypto.randomUUID(),
        name: payload.name,
        warning: payload.warning,
      }
      return { ...s, subservices: [...s.subservices, newSub] }
    })

    const next: ServiceCatalog = { ...current, services: nextServices }
    await setDoc(catalogDocRef, next)
    set({ catalog: next })
  },

  updateSubservice: async (serviceId, subId, payload) => {
    const state = get()
    const current = state.catalog ?? (await loadOrCreateDefaultCatalog())

    const nextServices = current.services.map((s) => {
      if (s.id !== serviceId) return s
      const nextSubs = s.subservices.map((sub) =>
        sub.id === subId
          ? {
              ...sub,
              name: payload.name ?? sub.name,
              warning: payload.warning ?? sub.warning,
            }
          : sub
      )
      return { ...s, subservices: nextSubs }
    })

    const next: ServiceCatalog = { ...current, services: nextServices }
    await setDoc(catalogDocRef, next)
    set({ catalog: next })
  },

  removeSubservice: async (serviceId, subId) => {
    const state = get()
    const current = state.catalog ?? (await loadOrCreateDefaultCatalog())

    const nextServices = current.services.map((s) => {
      if (s.id !== serviceId) return s
      const nextSubs = s.subservices.filter((sub) => sub.id !== subId)
      return { ...s, subservices: nextSubs }
    })

    const next: ServiceCatalog = { ...current, services: nextServices }
    await setDoc(catalogDocRef, next)
    set({ catalog: next })
  },
}))
