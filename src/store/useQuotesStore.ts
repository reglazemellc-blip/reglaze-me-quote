// -------------------------------------------------------------
// useQuotesStore.ts  (UPGRADED FOR NEW DATABASE TYPES)
// -------------------------------------------------------------

import { create } from "zustand";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db as firestoreDb } from "../firebase";
import type { Quote, Attachment } from "@db/index";
import { sumItems } from "@utils/quote";

type QuotesState = {
  quotes: Quote[];
  loading: boolean;
  init: () => Promise<void>;
  upsert: (q: Partial<Quote>) => Promise<Quote>;
  remove: (id: string) => Promise<void>;
  byClient: (clientId: string) => Quote[];
  search: (term: string) => Quote[];
};

const quotesCol = collection(firestoreDb, "quotes");

/**
 * Normalize a Quote into a fully-populated safe object
 * so Firestore + UI + TypeScript all agree.
 */
function normalizeQuote(raw: Partial<Quote>): Quote {
  const items = raw.items ?? [];
  const subtotal = raw.subtotal ?? sumItems(items);
  const taxRate = raw.taxRate ?? 0;
  const discount = raw.discount ?? 0;
  const tax = raw.tax ?? subtotal * taxRate;
  const total = raw.total ?? subtotal + tax - discount;

  return {
    id: raw.id!,
    clientId: raw.clientId!,
    clientName: raw.clientName ?? "",

    items,
    services: raw.services ?? [],

    subtotal,
    taxRate,
    tax,
    discount,
    total,

    notes: raw.notes ?? "",
    status: raw.status ?? "pending",
    signature: raw.signature ?? null,

    // ---- NEW FIELDS ----
    attachments: raw.attachments ?? [],
    pdfUrl: raw.pdfUrl ?? null,
    sentAt: raw.sentAt ?? null,
    expiresAt: raw.expiresAt ?? null,

    createdAt: raw.createdAt!,
    updatedAt: raw.updatedAt!,
  };
}

export const useQuotesStore = create<QuotesState>((set, get) => ({
  quotes: [],
  loading: true,

  // -------------------------------------------------
  // LOAD ALL QUOTES
  // -------------------------------------------------
  init: async () => {
    const snap = await getDocs(query(quotesCol, orderBy("updatedAt", "desc")));

    const quotes: Quote[] = snap.docs.map((d) => {
      const data = d.data() as Partial<Quote>;
      const now = Date.now();

      return normalizeQuote({
        ...data,
        id: d.id,
        createdAt: data.createdAt ?? now,
        updatedAt: data.updatedAt ?? now,
      });
    });

    set({ quotes, loading: false });
  },

  // -------------------------------------------------
  // UPSERT (CREATE OR UPDATE)
  // -------------------------------------------------
  upsert: async (q) => {
    const now = Date.now();

    const base: Partial<Quote> = {
      ...q,
      createdAt: q.createdAt ?? now,
      updatedAt: now,
    };

    const clean = normalizeQuote(base);

    await setDoc(doc(quotesCol, clean.id), clean, { merge: true });

    // reload quotes
    const snap = await getDocs(query(quotesCol, orderBy("updatedAt", "desc")));
    const quotes: Quote[] = snap.docs.map((d) => {
      const data = d.data() as Partial<Quote>;
      return normalizeQuote({ ...data, id: d.id });
    });

    set({ quotes });

    return clean;
  },

  // -------------------------------------------------
  // REMOVE QUOTE
  // -------------------------------------------------
  remove: async (id) => {
    await deleteDoc(doc(quotesCol, id));

    const snap = await getDocs(query(quotesCol, orderBy("updatedAt", "desc")));
    const quotes: Quote[] = snap.docs.map((d) => {
      const data = d.data() as Partial<Quote>;
      return normalizeQuote({ ...data, id: d.id });
    });

    set({ quotes });
  },

  // -------------------------------------------------
  // FILTER BY CLIENT
  // -------------------------------------------------
  byClient: (clientId) => {
    return get().quotes.filter((q) => q.clientId === clientId);
  },

  // -------------------------------------------------
  // SEARCH QUOTES
  // -------------------------------------------------
  search: (term) => {
    const q = term.toLowerCase();
    return get().quotes.filter((quote) =>
      [
        quote.id,
        quote.clientName,
        quote.notes,
        quote.status,
        quote.total.toString(),
      ]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q))
    );
  },
}));
