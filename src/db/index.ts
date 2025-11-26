import Dexie, { Table } from "dexie";
import { db as firestoreDb } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { businessProfile } from "@config/businessProfile";
import { theme } from "@config/theme";

// ------------------ Shared Types ------------------

export type AttachmentType = "photo" | "document" | "contract" | "care_sheet";

export type Attachment = {
  id: string;
  name: string;
  url: string;
  type: AttachmentType;
  createdAt: number;

  // Firebase Storage path (needed to delete from storage)
  path: string;

  // optional link back to a conversation
  conversationId?: string;
};

export type ConversationChannel =
  | "call"
  | "text"
  | "email"
  | "in_person"
  | "other";

export type ConversationEntry = {
  id: string;
  message: string;
  channel: ConversationChannel;
  createdAt: number;

  // which attachments belong to this conversation
  attachmentIds?: string[];
};

export type Reminder = {
  id: string;
  clientId: string;
  quoteId?: string;
  remindAt: number; // timestamp (ms)
  snoozeDays?: number;
  done: boolean;
  note?: string;
};

// ------------------ Core Entities ------------------

export type Client = {
  id: string;
  name: string;

  phone?: string;
  email?: string;

  // full street address
  address?: string;

  // NEW FIELDS — used by Clients page + QuoteEditor option C
  city?: string;
  state?: string;
  zip?: string;

  notes?: string;

  // legacy
  photos?: string[];

  // new-style
  attachments?: Attachment[];
  conversations?: ConversationEntry[];
  reminders?: Reminder[];

  createdAt: number;
  updatedAt: number;
};


export type QuoteStatus =
  | "pending"
  | "approved"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "canceled";

export type LineItem = {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
  warning?: string;

  // New: service description saved with the line
  serviceDescription?: string;
};

export type Signature = {
  dataUrl: string;
  signedAt?: string;
};

export type QuoteClientSnapshot = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
};

export type Quote = {
  id: string;

  // link to client doc
  clientId: string;

  // legacy flat fields
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  clientAddress?: string;

  // frozen snapshot at time of quote
  client?: QuoteClientSnapshot;

  items: LineItem[];
  services: string[];
  subtotal: number;
  taxRate: number;
  tax: number;
  discount: number;
  total: number;
  notes: string;
  status: QuoteStatus;
  signature: any | null;

  appointmentDate?: string | null;
  appointmentTime?: string | null;

  // full typed attachments saved on quote
  attachments: Attachment[];

  pdfUrl: string | null;
  sentAt: number | null;
  expiresAt: number | null;
  createdAt: number;
  updatedAt: number;
};

export type InvoiceStatus = "unpaid" | "partial" | "paid" | "overdue" | "refunded";

export type Payment = {
  id: string;
  amount: number;
  method: 'cash' | 'check' | 'credit_card' | 'venmo' | 'zelle' | 'other';
  date: number;
  notes?: string;
};

export type Invoice = {
  id: string;
  invoiceNumber?: string; // inv-YYYYMMDD-####
  clientId: string;
  quoteId?: string;

  // Client snapshot (similar to quotes)
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  clientAddress?: string;

  // Line items (copied from quote or manual)
  items: LineItem[];

  subtotal: number;
  taxRate: number;
  tax: number;
  discount: number;
  total: number;

  amountPaid: number;
  status: InvoiceStatus;

  dueDate?: number;
  notes?: string;

  // Payment tracking
  payments?: Payment[];

  attachments?: Attachment[];

  pdfUrl?: string;
  sentAt?: number;

  createdAt: number;
  updatedAt: number;
};

export type ContractStatus = 'draft' | 'sent' | 'client_signed' | 'fully_signed' | 'canceled';

export type ContractSignature = {
  dataUrl: string;
  signedAt: number;
  name?: string;
};

export type Contract = {
  id: string;
  contractNumber?: string; // con-YYYYMMDD-####
  clientId: string;
  quoteId?: string;
  invoiceId?: string;

  // Client snapshot
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  clientAddress?: string;

  // Template used
  templateVersion: string;

  // Contract content (filled template)
  content: string;

  // Contract specifics
  totalAmount: number;
  depositAmount?: number;
  appointmentDate?: string;
  appointmentTime?: string;

  // Signatures
  clientSignature?: ContractSignature;
  contractorSignature?: ContractSignature;

  status: ContractStatus;

  pdfUrl?: string;
  sentAt?: number;

  createdAt: number;
  updatedAt: number;
};

export type Settings = {
  id: string;
  companyLeftLines: string[];
  companyRightLines: string[];
  theme: {
    primary: string;
    secondary: string;
    accent1: string;
    accent2: string;
    background: string;
  };
  defaultTaxRate: number;
  nextSequence: number;
  watermark?: string;
};

export type ServiceCatalog = {
  id: string;
  services: Array<{
    id: string;
    name: string;
    subservices: Array<{
      id: string;
      name: string;
      warning?: string;
    }>;
  }>;
};

// ------------------ Local Dexie DB ------------------

export class AppDB extends Dexie {
  clients!: Table<Client, string>;
  quotes!: Table<Quote, string>;
  settings!: Table<Settings, string>;
  catalog!: Table<ServiceCatalog, string>;
  invoices!: Table<Invoice, string>;
  contracts!: Table<Contract, string>;

  constructor() {
    super("reglaze-me-db");

    // old schema (v1) kept for safety
    this.version(1).stores({
      clients: "id, createdAt, updatedAt, name, email, phone",
      quotes: "id, clientId, createdAt, updatedAt, status, clientName",
      settings: "id",
      catalog: "id",
    });

    // schema v2 with invoices table
    this.version(2).stores({
      clients: "id, createdAt, updatedAt, name, email, phone",
      quotes: "id, clientId, createdAt, updatedAt, status, clientName",
      settings: "id",
      catalog: "id",
      invoices: "id, clientId, quoteId, status, createdAt, updatedAt",
    });

    // schema v3 with contracts table
    this.version(3).stores({
      clients: "id, createdAt, updatedAt, name, email, phone",
      quotes: "id, clientId, createdAt, updatedAt, status, clientName",
      settings: "id",
      catalog: "id",
      invoices: "id, clientId, quoteId, status, createdAt, updatedAt",
      contracts: "id, clientId, quoteId, invoiceId, status, createdAt, updatedAt",
    });
  }
}

export const db = new AppDB();

// ------------------ Settings Loader ------------------

export async function getOrInitSettings(): Promise<Settings> {
  const ref = doc(firestoreDb, "settings", "settings");
  const snap = await getDoc(ref);

  if (snap.exists()) {
    return snap.data() as Settings;
  }

  const defaults: Settings = {
    id: "settings",
    companyLeftLines: [...businessProfile.companyLeftLines],
    companyRightLines: [...businessProfile.companyRightLines],
    theme: {
      primary: theme.defaults.primary,
      secondary: theme.defaults.secondary,
      accent1: theme.defaults.accent1,
      accent2: theme.defaults.accent2,
      background: theme.defaults.background,
    },
    watermark: "",
    defaultTaxRate: businessProfile.defaultTaxRate,
    nextSequence: 1,
  };

  await setDoc(ref, defaults);
  return defaults;
}
