import { create } from "zustand";
import { collection, doc, getDocs, setDoc, deleteDoc, getDoc, updateDoc, query, where } from "firebase/firestore";
import { db } from "../firebase";
import type { Quote } from "@db/index";
import { useConfigStore } from "@store/useConfigStore";
import { handleFirestoreOperation, validateRequired } from "@utils/errorHandling";

const quotesCol = collection(db, "quotes");

type QuotesState = {
  quotes: Quote[];
  loading: boolean;

  init: () => Promise<void>;
  upsert: (q: Quote) => Promise<void>;
  remove: (id: string) => Promise<void>;
  getQuotesByProperty: (propertyId: string) => Promise<Quote[]>;
};

export const useQuotesStore = create<QuotesState>((set, get) => ({
  quotes: [],
  loading: true,

  // ============================================================
  // INIT — Load only this tenant's quotes
  // ============================================================
  init: async () => {
    return handleFirestoreOperation(async () => {
      const snap = await getDocs(quotesCol);
      const tenantId = useConfigStore.getState().activeTenantId;

      const quotes = snap.docs
             .map((d) => ({ ...(d.data() as Quote), id: d.id }))
        .filter((q) => q.tenantId === tenantId);


      set({ quotes, loading: false });
    }, 'Load quotes');
  },

  // ============================================================
  // UPSERT — Save + reload only this tenant's quotes
  // + Sync workflow status to client
  // ============================================================
  upsert: async (q: Quote) => {
    validateRequired(q, ['clientId', 'id']);

    if (q.companyId && !q.propertyId) {
      throw new Error('Property ID is required when companyId is provided');
    }

    if (q.propertyId && !q.companyId) {
      throw new Error('Company ID is required when propertyId is provided');
    }

    return handleFirestoreOperation(async () => {
      const tenantId = useConfigStore.getState().activeTenantId;
      const ref = doc(quotesCol, q.id);

      // write with tenantId enforced
      await setDoc(
        ref,
        { ...q, tenantId },
        { merge: true }
      );

      // Sync workflow status to client (Quote is source of truth)
      if (q.workflowStatus && q.clientId) {
        const clientRef = doc(db, 'clients', q.clientId);
        const clientSnap = await getDoc(clientRef);
        
        if (clientSnap.exists()) {
          await updateDoc(clientRef, {
            workflowStatus: q.workflowStatus,
            scheduledDate: q.scheduledDate || null,
            scheduledTime: q.scheduledTime || null,
            updatedAt: Date.now(),
          });
        }
      }

      // reload only this tenant's quotes
      const snap = await getDocs(quotesCol);
      const quotes = snap.docs
        .map((d) => ({ ...(d.data() as Quote), id: d.id }))
        .filter((q) => q.tenantId === tenantId);

      set({ quotes });
    }, 'Save quote');
  },

  // ============================================================
  // QUERY — Fetch quotes for a property via Firestore
  // ============================================================
  getQuotesByProperty: async (propertyId: string) => {
    return handleFirestoreOperation(async () => {
      const tenantId = useConfigStore.getState().activeTenantId;
      const propertyQuotesQuery = query(quotesCol, where('tenantId', '==', tenantId), where('propertyId', '==', propertyId));
      const snap = await getDocs(propertyQuotesQuery);

      return snap.docs.map((d) => ({ ...(d.data() as Quote), id: d.id }));
    }, 'Load quotes by property');
  },

  // ============================================================
  // REMOVE — Delete + reload only this tenant's quotes
  // ============================================================
  remove: async (id: string) => {
    return handleFirestoreOperation(async () => {
      await deleteDoc(doc(quotesCol, id));

      const tenantId = useConfigStore.getState().activeTenantId;

      const snap = await getDocs(quotesCol);
      const quotes = snap.docs
        .map((d) => ({ ...(d.data() as Quote), id: d.id }))
        .filter((q) => q.tenantId === tenantId);

      set({ quotes });
    }, 'Delete quote');
  },
}));