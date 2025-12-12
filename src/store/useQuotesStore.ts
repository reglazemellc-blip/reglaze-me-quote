import { create } from "zustand";
import { collection, doc, getDocs, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { Quote } from "@db/index";
import { useConfigStore } from "@store/useConfigStore";

const quotesCol = collection(db, "quotes");

type QuotesState = {
  quotes: Quote[];
  loading: boolean;

  init: () => Promise<void>;
  upsert: (q: Quote) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

export const useQuotesStore = create<QuotesState>((set, get) => ({
  quotes: [],
  loading: true,

  // ============================================================
  // INIT — Load only this tenant's quotes
  // ============================================================
  init: async () => {
    const snap = await getDocs(quotesCol);

    const tenantId = useConfigStore.getState().activeTenantId;

    const quotes = snap.docs
      .map((d) => ({ ...(d.data() as Quote), id: d.id }))
      .filter((q) => q.tenantId === tenantId);

    set({ quotes, loading: false });
  },

  // ============================================================
  // UPSERT — Save + reload only this tenant's quotes
  // ============================================================
  upsert: async (q: Quote) => {
    if (!q.clientId) throw new Error("Quote missing clientId");

    const tenantId = useConfigStore.getState().activeTenantId;

    const ref = doc(quotesCol, q.id);

    // write with tenantId enforced
    await setDoc(
      ref,
      { ...q, tenantId },
      { merge: true }
    );

    // reload only this tenant's quotes
    const snap = await getDocs(quotesCol);
    const quotes = snap.docs
      .map((d) => ({ ...(d.data() as Quote), id: d.id }))
      .filter((q) => q.tenantId === tenantId);

    set({ quotes });
  },

  // ============================================================
  // REMOVE — Delete + reload only this tenant's quotes
  // ============================================================
  remove: async (id: string) => {
    await deleteDoc(doc(quotesCol, id));

    const tenantId = useConfigStore.getState().activeTenantId;

    const snap = await getDocs(quotesCol);
    const quotes = snap.docs
      .map((d) => ({ ...(d.data() as Quote), id: d.id }))
      .filter((q) => q.tenantId === tenantId);

    set({ quotes });
  },
}));
