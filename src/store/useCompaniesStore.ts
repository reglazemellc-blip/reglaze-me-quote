// -------------------------------------------------------------
// useCompaniesStore.ts - Manage property management companies and their properties
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
import type { Company, Property, Attachment, ConversationEntry } from '@db/index'
import { handleFirestoreOperation } from '@utils/errorHandling'
import { useToastStore } from './useToastStore'

type CompaniesState = {
  companies: Company[]
  properties: Property[]
  loading: boolean

  init: () => Promise<void>

  // Company CRUD
  upsertCompany: (c: Partial<Company>) => Promise<Company>
  removeCompany: (id: string) => Promise<void>

  // Property CRUD
  upsertProperty: (p: Partial<Property>) => Promise<Property>
  removeProperty: (id: string) => Promise<void>

  // Helpers
  getPropertiesByCompany: (companyId: string) => Property[]
  getScheduledJobs: () => Property[] // All properties with scheduledDate
  searchCompanies: (term: string) => Company[]
}

const companiesCol = collection(db, 'companies')
const propertiesCol = collection(db, 'properties')

function createId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2)}`
}

export const useCompaniesStore = create<CompaniesState>((set, get) => ({
  companies: [],
  properties: [],
  loading: true,

  // -------------------------------------------------
  // LOAD ALL COMPANIES & PROPERTIES
  // -------------------------------------------------
  init: async () => {
    set({ loading: true })
    await handleFirestoreOperation(async () => {
      if (!auth.currentUser) {
        set({ loading: false })
        return
      }

      let tenantId = useConfigStore.getState().activeTenantId
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
        useToastStore.getState().show('Tenant ID missing. Please log in again.')
        set({ loading: false })
        return
      }
      // Load companies
      const compSnap = await getDocs(query(companiesCol, where('tenantId', '==', tenantId)))
      const companies: Company[] = compSnap.docs.map((d) => ({
        ...(d.data() as Company),
        id: d.id,
      }))
      // Load properties
      const propSnap = await getDocs(query(propertiesCol, where('tenantId', '==', tenantId)))
      const properties: Property[] = propSnap.docs.map((d) => ({
        ...(d.data() as Property),
        id: d.id,
      }))
      set({ companies, properties, loading: false })
    }, 'Load companies and properties')
  },

  // -------------------------------------------------
  // CREATE / UPDATE COMPANY
  // -------------------------------------------------
  upsertCompany: async (c) => {
    return await handleFirestoreOperation(async () => {
      let tenantId = useConfigStore.getState().activeTenantId
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
        useToastStore.getState().show('Tenant ID missing. Please log in again.')
        throw new Error('tenantId missing during company upsert')
      }
      const now = Date.now()
      const id = c.id || createId()
      const name = (c.name ?? '').trim()
      if (!name) {
        console.error('Company validation failed: name is required')
        throw new Error('Invalid data')
      }
      const clean: Company = {
        id,
        tenantId,
        name,
        contactName: c.contactName ?? '',
        phone: c.phone ?? '',
        email: c.email ?? '',
        billingAddress: c.billingAddress ?? '',
        billingCity: c.billingCity ?? '',
        billingState: c.billingState ?? '',
        billingZip: c.billingZip ?? '',
        notes: c.notes ?? '',
        conversations: (c.conversations ?? []).filter(Boolean),
        attachments: (c.attachments ?? []).filter(Boolean),
        createdAt: c.createdAt ?? now,
        updatedAt: now,
      }
      const payload = JSON.parse(JSON.stringify(clean))
      await setDoc(doc(companiesCol, clean.id), payload)
      // Reload companies
      const snap = await getDocs(query(companiesCol, where('tenantId', '==', tenantId)))
      const companies: Company[] = snap.docs.map((d) => ({
        ...(d.data() as Company),
        id: d.id,
      }))
      set({ companies })
      return clean
    }, 'Upsert company')
  },

  // -------------------------------------------------
  // REMOVE COMPANY (and its properties)
  // -------------------------------------------------
  removeCompany: async (id) => {
    await handleFirestoreOperation(async () => {
      const tenantId = useConfigStore.getState().activeTenantId
      // Delete company
      await deleteDoc(doc(companiesCol, id))
      // Delete all properties belonging to this company
      const propSnap = await getDocs(query(propertiesCol, where('companyId', '==', id)))
      const deletes = propSnap.docs.map((d) => deleteDoc(doc(propertiesCol, d.id)))
      await Promise.all(deletes)
      // Reload
      const compSnap = await getDocs(query(companiesCol, where('tenantId', '==', tenantId)))
      const companies: Company[] = compSnap.docs.map((d) => ({
        ...(d.data() as Company),
        id: d.id,
      }))
      const newPropSnap = await getDocs(query(propertiesCol, where('tenantId', '==', tenantId)))
      const properties: Property[] = newPropSnap.docs.map((d) => ({
        ...(d.data() as Property),
        id: d.id,
      }))
      set({ companies, properties })
    }, 'Remove company')
  },

  // -------------------------------------------------
  // CREATE / UPDATE PROPERTY
  // -------------------------------------------------
  upsertProperty: async (p) => {
    return await handleFirestoreOperation(async () => {
      let tenantId = useConfigStore.getState().activeTenantId
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
        useToastStore.getState().show('Tenant ID missing. Please log in again.')
        throw new Error('tenantId missing during property upsert')
      }
      const now = Date.now()
      const id = p.id || createId()
      const companyId = (p.companyId ?? '').trim()
      const address = (p.address ?? '').trim()
      const name = (p.name ?? p.address ?? '').trim()
      if (!companyId) {
        console.error('Property validation failed: companyId is required')
        throw new Error('Invalid data')
      }
      if (!address) {
        console.error('Property validation failed: address is required')
        throw new Error('Invalid data')
      }
      if (!name) {
        console.error('Property validation failed: name is required')
        throw new Error('Invalid data')
      }
      const clean: Property = {
        id,
        companyId,
        tenantId,
        name,
        address,
        unit: p.unit ?? '',
        city: p.city ?? '',
        state: p.state ?? '',
        zip: p.zip ?? '',
        propertyManagerName: p.propertyManagerName ?? null,
        propertyManagerPhone: p.propertyManagerPhone ?? null,
        propertyManagerEmail: p.propertyManagerEmail ?? null,
        maintenanceName: p.maintenanceName ?? null,
        maintenancePhone: p.maintenancePhone ?? null,
        maintenanceEmail: p.maintenanceEmail ?? null,
        workflowStatus: p.workflowStatus ?? 'new',
        documentTracking: p.documentTracking ?? {},
        scheduledDate: p.scheduledDate ?? null,
        scheduledTime: p.scheduledTime ?? null,
        quoteId: p.quoteId ?? null,
        invoiceId: p.invoiceId ?? null,
        contractId: p.contractId ?? null,
        notes: p.notes ?? '',
        attachments: p.attachments ?? [],
        createdAt: p.createdAt ?? now,
        updatedAt: now,
      }
      await setDoc(doc(propertiesCol, clean.id), clean)
      // Reload properties
      const snap = await getDocs(query(propertiesCol, where('tenantId', '==', tenantId)))
      const properties: Property[] = snap.docs.map((d) => ({
        ...(d.data() as Property),
        id: d.id,
      }))
      set({ properties })
      return clean
    }, 'Upsert property')
  },

  // -------------------------------------------------
  // REMOVE PROPERTY
  // -------------------------------------------------
  removeProperty: async (id) => {
    await handleFirestoreOperation(async () => {
      const tenantId = useConfigStore.getState().activeTenantId
      await deleteDoc(doc(propertiesCol, id))
      // Reload
      const snap = await getDocs(query(propertiesCol, where('tenantId', '==', tenantId)))
      const properties: Property[] = snap.docs.map((d) => ({
        ...(d.data() as Property),
        id: d.id,
      }))
      set({ properties })
    }, 'Remove property')
  },

  // -------------------------------------------------
  // HELPERS
  // -------------------------------------------------
  getPropertiesByCompany: (companyId) => {
    return get().properties.filter((p) => p.companyId === companyId)
  },

  getScheduledJobs: () => {
    return get().properties.filter((p) => p.scheduledDate && p.workflowStatus === 'scheduled')
  },

  searchCompanies: (term) => {
    const q = term.toLowerCase()
    return get().companies.filter((c) =>
      [c.name, c.contactName, c.phone, c.email]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q))
    )
  },
}))
