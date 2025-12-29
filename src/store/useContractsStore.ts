/**
 * Contracts Store
 * Manages contracts with Firestore sync
 */
import { create } from 'zustand'
import { collection, doc, getDocs, setDoc, deleteDoc, deleteField, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useConfigStore } from '@store/useConfigStore'
import type { Contract, ContractStatus } from '@db/index'


const contractsCol = collection(db, 'contracts')

type ContractsState = {
  contracts: Contract[]
  loading: boolean
  init: () => Promise<void>
  upsert: (contract: Contract) => Promise<void>
  remove: (id: string) => Promise<void>
  updateStatus: (id: string, status: ContractStatus) => Promise<void>
  addSignature: (
    id: string,
    type: 'client' | 'contractor',
    signature: { dataUrl: string; name: string; date: number }
  ) => Promise<void>
  removeSignature: (id: string, type: 'client' | 'contractor') => Promise<void>
  getByClient: (clientId: string) => Contract[]
  getByQuote: (quoteId: string) => Contract | undefined
}

export const useContractsStore = create<ContractsState>((set, get) => ({
  contracts: [],
  loading: true,

  init: async () => {
    try {
      const tenantId = useConfigStore.getState().activeTenantId
      const snap = await getDocs(contractsCol)
      const contracts = snap.docs
        .map((d) => ({ ...(d.data() as Contract), id: d.id }))
        .filter((c) => c.tenantId === tenantId)
      set({ contracts, loading: false })
    } catch (error) {
      console.error('Error loading contracts:', error)
      set({ loading: false })
    }
  },

  upsert: async (contract: Contract) => {
    try {
            const tenantId = useConfigStore.getState().activeTenantId
      const ref = doc(contractsCol, contract.id)
      await setDoc(ref, { ...contract, tenantId }, { merge: true })

      const snap = await getDocs(contractsCol)
      const contracts = snap.docs
        .map((d) => ({ ...(d.data() as Contract), id: d.id }))
        .filter((c) => c.tenantId === tenantId)
      set({ contracts })

    } catch (error) {
      console.error('Failed to save contract:', error);
      throw new Error('Failed to save contract. Please check your connection and try again.');
    }
  },

  remove: async (id: string) => {
    try {
            await deleteDoc(doc(contractsCol, id))

         // Refresh contracts list
    const tenantId = useConfigStore.getState().activeTenantId
    const snap = await getDocs(contractsCol)
    const contracts = snap.docs
      .map((d) => ({ ...(d.data() as Contract), id: d.id }))
      .filter((c) => c.tenantId === tenantId)
    set({ contracts })


    } catch (error) {
      console.error('Failed to delete contract:', error);
      throw new Error('Failed to delete contract. Please check your connection and try again.');
    }
  },

  updateStatus: async (id: string, status: ContractStatus) => {
    const contract = get().contracts.find((c) => c.id === id)
    if (!contract) return

    const updated = {
      ...contract,
      status,
      updatedAt: Date.now(),
    }

    await get().upsert(updated)
  },

  addSignature: async (
    id: string,
    type: 'client' | 'contractor',
    signature: { dataUrl: string; name: string; date: number }
  ) => {
    const contract = get().contracts.find((c) => c.id === id)
    if (!contract) return

    const updated = {
      ...contract,
      [type === 'client' ? 'clientSignature' : 'contractorSignature']: signature,
      updatedAt: Date.now(),
    }

    // Auto-update status when both signatures present
    if (updated.clientSignature && updated.contractorSignature && updated.status === 'sent') {
      updated.status = 'signed'
    }

    await get().upsert(updated)
  },

  removeSignature: async (id: string, type: 'client' | 'contractor') => {
    const ref = doc(contractsCol, id)
    const fieldName = type === 'client' ? 'clientSignature' : 'contractorSignature'
    
    // Use updateDoc with deleteField to properly remove the field
    await updateDoc(ref, {
      [fieldName]: deleteField(),
      updatedAt: Date.now(),
    })

    // Refresh contracts list
    const snap = await getDocs(contractsCol)
    const contracts = snap.docs.map((d) => ({ ...(d.data() as Contract), id: d.id }))
    set({ contracts })
  },

  getByClient: (clientId: string) => {
    return get().contracts.filter((c) => c.clientId === clientId)
  },

  getByQuote: (quoteId: string) => {
    // Replace 'quoteId' with the correct property name if different, e.g., 'relatedQuoteId'
    return get().contracts.find((c) => (c as any).quoteId === quoteId)
  },
}))
