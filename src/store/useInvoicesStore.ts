// -------------------------------------------------------------
// useInvoicesStore.ts — Invoice Management Store
// Handles CRUD for invoices with Firestore persistence
// -------------------------------------------------------------

import { create } from 'zustand';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Invoice, InvoiceStatus, Payment, Quote, LineItem } from '@db/index';

const invoicesCol = collection(db, 'invoices');

// Helper to generate invoice number: inv-YYYYMMDD-####
function generateInvoiceNumber(sequence: number): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const seq = String(sequence).padStart(4, '0');
  return `inv-${y}${m}${d}-${seq}`;
}

// Simple ID helper
function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

type InvoicesState = {
  invoices: Invoice[];
  loading: boolean;
  nextSequence: number;

  init: () => Promise<void>;
  upsert: (invoice: Partial<Invoice>) => Promise<Invoice>;
  remove: (id: string) => Promise<void>;

  // Convert quote to invoice
  createFromQuote: (quote: Quote) => Promise<Invoice>;

  // Payment management
  addPayment: (invoiceId: string, payment: Omit<Payment, 'id'>) => Promise<void>;
  removePayment: (invoiceId: string, paymentId: string) => Promise<void>;

  // Status helpers
  updateStatus: (invoiceId: string, status: InvoiceStatus) => Promise<void>;
  calculateStatus: (invoice: Invoice) => InvoiceStatus;
};

export const useInvoicesStore = create<InvoicesState>((set, get) => ({
  invoices: [],
  loading: true,
  nextSequence: 1,

  // -------------------------------------------------
  // INIT — Load all invoices
  // -------------------------------------------------
  init: async () => {
    set({ loading: true });

    const q = query(invoicesCol, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);

    const invoices: Invoice[] = snap.docs.map((d) => ({
      ...(d.data() as Invoice),
      id: d.id,
    }));

    // Calculate next sequence based on existing invoices
    let maxSeq = 0;
    invoices.forEach((inv) => {
      if (inv.invoiceNumber) {
        const match = inv.invoiceNumber.match(/-(\d{4})$/);
        if (match) {
          const seq = parseInt(match[1], 10);
          if (seq > maxSeq) maxSeq = seq;
        }
      }
    });

    set({ invoices, loading: false, nextSequence: maxSeq + 1 });
  },

  // -------------------------------------------------
  // UPSERT — Create or update invoice
  // -------------------------------------------------
  upsert: async (data) => {
    const now = Date.now();
    const state = get();

    const id = data.id ?? createId();

    // Generate invoice number for new invoices
    let invoiceNumber = data.invoiceNumber;
    if (!invoiceNumber && !data.id) {
      invoiceNumber = generateInvoiceNumber(state.nextSequence);
      set({ nextSequence: state.nextSequence + 1 });
    }

    const invoice: Invoice = {
      id,
      invoiceNumber,
      clientId: data.clientId ?? '',
      quoteId: data.quoteId,
      clientName: data.clientName ?? '',
      clientPhone: data.clientPhone,
      clientEmail: data.clientEmail,
      clientAddress: data.clientAddress,
      items: data.items ?? [],
      subtotal: data.subtotal ?? 0,
      taxRate: data.taxRate ?? 0,
      tax: data.tax ?? 0,
      discount: data.discount ?? 0,
      total: data.total ?? 0,
      amountPaid: data.amountPaid ?? 0,
      status: data.status ?? 'unpaid',
      dueDate: data.dueDate,
      notes: data.notes,
      payments: data.payments ?? [],
      attachments: data.attachments ?? [],
      pdfUrl: data.pdfUrl,
      sentAt: data.sentAt,
      createdAt: data.createdAt ?? now,
      updatedAt: now,
    };

    const ref = doc(invoicesCol, id);
    await setDoc(ref, invoice, { merge: true });

    // Update local state
    const invoices = state.invoices.filter((i) => i.id !== id);
    set({ invoices: [invoice, ...invoices] });

    return invoice;
  },

  // -------------------------------------------------
  // REMOVE — Delete invoice
  // -------------------------------------------------
  remove: async (id) => {
    await deleteDoc(doc(invoicesCol, id));
    set({ invoices: get().invoices.filter((i) => i.id !== id) });
  },

  // -------------------------------------------------
  // CREATE FROM QUOTE — Convert quote to invoice
  // -------------------------------------------------
  createFromQuote: async (quote) => {
    const state = get();

    const invoiceNumber = generateInvoiceNumber(state.nextSequence);
    set({ nextSequence: state.nextSequence + 1 });

    const now = Date.now();
    const id = createId();

    // Set due date to 30 days from now by default
    const dueDate = now + 30 * 24 * 60 * 60 * 1000;

    const invoice: Invoice = {
      id,
      invoiceNumber,
      clientId: quote.clientId,
      quoteId: quote.id,
      clientName: quote.clientName,
      clientPhone: quote.clientPhone,
      clientEmail: quote.clientEmail,
      clientAddress: quote.clientAddress,
      items: quote.items.map((item: LineItem) => ({ ...item })),
      subtotal: quote.subtotal,
      taxRate: quote.taxRate,
      tax: quote.tax,
      discount: quote.discount,
      total: quote.total,
      amountPaid: 0,
      status: 'unpaid',
      dueDate,
      notes: quote.notes,
      payments: [],
      attachments: [],
      createdAt: now,
      updatedAt: now,
    };

    const ref = doc(invoicesCol, id);
    await setDoc(ref, invoice);

    set({ invoices: [invoice, ...state.invoices] });

    return invoice;
  },

  // -------------------------------------------------
  // ADD PAYMENT
  // -------------------------------------------------
  addPayment: async (invoiceId, paymentData) => {
    const state = get();
    const invoice = state.invoices.find((i) => i.id === invoiceId);
    if (!invoice) return;

    const payment: Payment = {
      id: createId(),
      ...paymentData,
    };

    const payments = [...(invoice.payments ?? []), payment];
    const amountPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const status = get().calculateStatus({ ...invoice, amountPaid });

    await get().upsert({
      id: invoiceId,
      payments,
      amountPaid,
      status,
    });
  },

  // -------------------------------------------------
  // REMOVE PAYMENT
  // -------------------------------------------------
  removePayment: async (invoiceId, paymentId) => {
    const state = get();
    const invoice = state.invoices.find((i) => i.id === invoiceId);
    if (!invoice) return;

    const payments = (invoice.payments ?? []).filter((p) => p.id !== paymentId);
    const amountPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const status = get().calculateStatus({ ...invoice, amountPaid });

    await get().upsert({
      id: invoiceId,
      payments,
      amountPaid,
      status,
    });
  },

  // -------------------------------------------------
  // UPDATE STATUS
  // -------------------------------------------------
  updateStatus: async (invoiceId, status) => {
    await get().upsert({ id: invoiceId, status });
  },

  // -------------------------------------------------
  // CALCULATE STATUS based on payments and due date
  // -------------------------------------------------
  calculateStatus: (invoice) => {
    if (invoice.amountPaid >= invoice.total) {
      return 'paid';
    }

    // Check overdue before partial - overdue takes precedence
    if (invoice.dueDate && invoice.dueDate < Date.now()) {
      return 'overdue';
    }

    if (invoice.amountPaid > 0) {
      return 'partial';
    }

    return 'unpaid';
  },
}));
