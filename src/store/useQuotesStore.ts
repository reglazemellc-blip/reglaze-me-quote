// -------------------------------------------------------------
// useQuotesStore — FIXED to ALWAYS save clientId + client snapshot
// -------------------------------------------------------------

import { create } from "zustand";
import { useConfigStore } from "@store/useConfigStore";
import { collection, doc, getDocs, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { Quote } from "@db/index";

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

  init: async () => {
    const snap = await getDocs(quotesCol);
    const tenantId = useConfigStore.getState().activeTenantId;
const quotes = snap.docs
  .map((d) => ({ ...(d.data() as Quote), id: d.id }))
  .filter((q) => q.tenantId === tenantId);

    set({ quotes, loading: false });
  },

  upsert: async (q: Quote) => {
    if (!q.clientId) throw new Error("Quote missing clientId");

    const ref = doc(quotesCol, q.id);

    await setDoc(ref, { ...q, tenantId: useConfigStore.getState().activeTenantId }, { merge: true });


    const snap = await getDocs(quotesCol);
    const quotes = snap.docs.map((d) => ({ ...(d.data() as Quote), id: d.id }));
    set({ quotes });
  },

  remove: async (id) => {
    await deleteDoc(doc(quotesCol, id));

    const snap = await getDocs(quotesCol);
    const quotes = snap.docs.map((d) => ({ ...(d.data() as Quote), id: d.id }));
    set({ quotes });
  },
}));
