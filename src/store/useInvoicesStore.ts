// -------------------------------------------------------------
// useInvoicesStore.ts — Invoices Store with Firestore
// -------------------------------------------------------------

import { create } from "zustand";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Invoice, InvoiceStatus } from "@db/index";

const invoicesCol = collection(db, "invoices");

// Invoice ID format: inv-YYYYMMDD-####
export function formatInvoiceId(d: Date, seq: number) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `inv-${yyyy}${mm}${dd}-${String(seq).padStart(4, "0")}`;
}

type InvoicesState = {
  invoices: Invoice[];
  loading: boolean;

  init: () => Promise<void>;
  getById: (id: string) => Promise<Invoice | null>;
  upsert: (invoice: Partial<Invoice>) => Promise<Invoice>;
  remove: (id: string) => Promise<void>;
  updateStatus: (id: string, status: InvoiceStatus) => Promise<void>;
  recordPayment: (id: string, amount: number) => Promise<void>;
};

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

export const useInvoicesStore = create<InvoicesState>((set, get) => ({
  invoices: [],
  loading: true,

  // Load all invoices
  init: async () => {
    set({ loading: true });
    const q = query(invoicesCol, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);

    const invoices: Invoice[] = snap.docs.map((d) => ({
      ...(d.data() as Invoice),
      id: d.id,
    }));

    set({ invoices, loading: false });
  },

  // Get single invoice by ID
  getById: async (id: string) => {
    const ref = doc(invoicesCol, id);
    const snap = await getDoc(ref);
    return snap.exists() ? (snap.data() as Invoice) : null;
  },

  // Create or update invoice
  upsert: async (data: Partial<Invoice>) => {
    const now = Date.now();
    const id = data.id ?? createId();

    const existing = get().invoices.find((i) => i.id === id);

    const invoice: Invoice = {
      id,
      invoiceNumber: data.invoiceNumber ?? existing?.invoiceNumber,
      clientId: data.clientId ?? existing?.clientId ?? "",
      quoteId: data.quoteId ?? existing?.quoteId,
      clientName: data.clientName ?? existing?.clientName,
      clientPhone: data.clientPhone ?? existing?.clientPhone,
      clientEmail: data.clientEmail ?? existing?.clientEmail,
      clientAddress: data.clientAddress ?? existing?.clientAddress,
      items: data.items ?? existing?.items ?? [],
      subtotal: data.subtotal ?? existing?.subtotal ?? 0,
      taxRate: data.taxRate ?? existing?.taxRate ?? 0,
      tax: data.tax ?? existing?.tax ?? 0,
      discount: data.discount ?? existing?.discount ?? 0,
      total: data.total ?? existing?.total ?? 0,
      amountPaid: data.amountPaid ?? existing?.amountPaid ?? 0,
      status: data.status ?? existing?.status ?? "unpaid",
      dueDate: data.dueDate ?? existing?.dueDate,
      notes: data.notes ?? existing?.notes,
      attachments: data.attachments ?? existing?.attachments ?? [],
      signature: data.signature ?? existing?.signature,
      pdfUrl: data.pdfUrl ?? existing?.pdfUrl ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    const ref = doc(invoicesCol, id);
    await setDoc(ref, invoice, { merge: true });

    // Update local state
    const invoices = get().invoices.filter((i) => i.id !== id);
    set({ invoices: [invoice, ...invoices] });

    return invoice;
  },

  // Delete invoice
  remove: async (id: string) => {
    await deleteDoc(doc(invoicesCol, id));
    set({ invoices: get().invoices.filter((i) => i.id !== id) });
  },

  // Update invoice status
  updateStatus: async (id: string, status: InvoiceStatus) => {
    const ref = doc(invoicesCol, id);
    const now = Date.now();
    await setDoc(ref, { status, updatedAt: now }, { merge: true });

    const invoices = get().invoices.map((i) =>
      i.id === id ? { ...i, status, updatedAt: now } : i
    );
    set({ invoices });
  },

  // Record a payment and update status
  recordPayment: async (id: string, amount: number) => {
    const invoice = get().invoices.find((i) => i.id === id);
    if (!invoice) return;

    const newAmountPaid = (invoice.amountPaid || 0) + amount;
    let newStatus: InvoiceStatus = invoice.status;

    if (newAmountPaid >= invoice.total) {
      newStatus = "paid";
    } else if (newAmountPaid > 0) {
      newStatus = "partial";
    }

    const ref = doc(invoicesCol, id);
    const now = Date.now();
    await setDoc(
      ref,
      { amountPaid: newAmountPaid, status: newStatus, updatedAt: now },
      { merge: true }
    );

    const invoices = get().invoices.map((i) =>
      i.id === id
        ? { ...i, amountPaid: newAmountPaid, status: newStatus, updatedAt: now }
        : i
    );
    set({ invoices });
  },
}));
