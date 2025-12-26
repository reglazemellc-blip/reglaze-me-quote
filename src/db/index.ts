import Dexie, { Table } from "dexie";
import { db as firestoreDb } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

// ------------------ Shared Types ------------------

export type AttachmentType = "photo" | "document" | "contract" | "care_sheet" | "pre_job" | "prep_care";

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

// Client intake checklist item
export type ChecklistItem = {
  id: string;
  question: string;
  checked: boolean;
  answer?: string;
  checkedAt?: number;
  // Predefined answer options (if empty, just shows text input)
  answerOptions?: string[];
};

// ------------------ Core Entities ------------------

export type Client = {
  id: string;
  tenantId: string
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

  // Legacy status (keeping for backwards compatibility)
  status?: 'new' | 'contacted' | 'quoted' | 'waiting' | 'closed'

  // NEW: Workflow pipeline status
  workflowStatus?: 'new' | 'docs_sent' | 'waiting_prejob' | 'ready_to_schedule' | 'scheduled' | 'in_progress' | 'completed' | 'invoiced' | 'paid';

  // NEW: Document tracking
  documentTracking?: {
    preJobSent?: number;
    preJobReceived?: number;
    preJobAttachmentId?: string;
    prepCareSent?: number;
    homeownerPrepSent?: number;
  };

  // NEW: Scheduling
  scheduledDate?: string;   // ISO date string (YYYY-MM-DD)
  scheduledTime?: string;   // Time string (e.g., "9:00 AM")

  // NEW: Optional link to a company (for property managed units)
  companyId?: string;

  // legacy
  photos?: string[];

  // new-style
  attachments?: Attachment[];
  conversations?: ConversationEntry[];
  reminders?: Reminder[];
  checklist?: ChecklistItem[];

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
  tenantId: string

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

  // Quote number and due date
  quoteNumber?: string;
  dueDate?: number;
  dueTerms?: string; // e.g., "Due upon completion", "Net 30"

  pdfUrl: string | null;
  sentAt: number | null;
  expiresAt: number | null;
  createdAt: number;
  updatedAt: number;
  
  // Jobsite readiness acknowledgment
  jobsiteReadyAcknowledged?: boolean;
  jobsiteReadyAcknowledgedAt?: number;

  // Water shutoff election (voids warranty)
  waterShutoffElected?: boolean;

  // NEW: Document tracking per quote (for workflow pipeline)
  documentTracking?: {
    preJobSent?: number;      // timestamp when pre-job was sent
    preJobReceived?: number;  // timestamp when pre-job was received back
    preJobAttachmentId?: string; // link to the received pre-job PDF
    prepCareSent?: number;    // timestamp when prep & care was sent
  };

  // NEW: Workflow status for this specific quote/job
  workflowStatus?: WorkflowStatus;

  // NEW: Scheduling specific to this quote
  scheduledDate?: string;   // ISO date string (YYYY-MM-DD)
  scheduledTime?: string;   // Time string (e.g., "9:00 AM")
};

export type InvoiceStatus = "unpaid" | "partial" | "paid" | "refunded";

export type Invoice = {
  id: string;
  invoiceNumber?: string;
  clientId: string;
  quoteId?: string;

  total: number;
  amountPaid: number;
  status: InvoiceStatus;

  dueDate?: number;
  notes?: string;

  attachments?: Attachment[];
  
  // Water shutoff election (voids warranty)
  waterShutoffElected?: boolean;

  createdAt: number;
  updatedAt: number;
  tenantId: string;

};

export type ContractStatus = "draft" | "sent" | "signed" | "completed" | "canceled";

export type Contract = {
  id: string;
  clientId: string;
  quoteId?: string;

   contractNumber?: string

  // Contract details
  templateId: string;
  terms: string;
  scope: string;
  warranty: string;

  // Project info
  startDate?: string;
  endDate?: string;
  propertyAddress?: string;

  // Financial
  totalAmount?: number;
  checkAmount?: number;
  cashAmount?: number;
  balanceAmount?: number;
  dueDate?: number;
  dueTerms?: string; // e.g., "Due upon completion", "Net 30"

  // Signatures
  clientSignature?: {
    dataUrl: string;
    name: string;
    date: number;
  };
  contractorSignature?: {
    dataUrl: string;
    name: string;
    date: number;
  };

  status: ContractStatus;
  notes?: string;
  
  // Water shutoff election (voids warranty)
  waterShutoffElected?: boolean;

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
  // Call script shown when making client calls
  callScript?: string;
  // Default intake checklist questions for new clients
  defaultChecklistQuestions?: string[];
  // Default answer options for each question (keyed by question text)
  defaultChecklistAnswerOptions?: Record<string, string[]>;
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

// ------------------ Workflow & Property Management ------------------

/**
 * Workflow status for tracking jobs through the pipeline
 */
export type WorkflowStatus =
  | "new"              // Just added, no action taken
  | "docs_sent"        // Pre-job & prep docs sent to client/manager
  | "waiting_prejob"   // Waiting for pre-job form to be returned
  | "ready_to_schedule" // Have pre-job back, can schedule
  | "scheduled"        // Date/time set for the job
  | "in_progress"      // Currently working on the job
  | "completed"        // Work finished
  | "invoiced"         // Invoice sent
  | "paid";            // Payment received

/**
 * Document tracking - what was sent and received
 */
export type DocumentTracking = {
  preJobSent?: number;      // timestamp when pre-job was sent
  preJobReceived?: number;  // timestamp when pre-job was received back
  preJobAttachmentId?: string; // link to the received pre-job PDF
  prepCareSent?: number;    // timestamp when prep & care was sent
  homeownerPrepSent?: number; // timestamp when homeowner prep was sent
};

/**
 * Property/Unit - individual apartment or location within a company
 */
export type Property = {
  id: string;
  companyId: string;        // parent company
  tenantId: string;

  // Location
  address: string;          // Street address
  unit?: string;            // Apt/Unit number (e.g., "1A", "Unit 5")
  city?: string;
  state?: string;
  zip?: string;

  // Workflow
  workflowStatus: WorkflowStatus;
  documentTracking?: DocumentTracking;

  // Scheduling
  scheduledDate?: string;   // ISO date string (YYYY-MM-DD)
  scheduledTime?: string;   // Time string (e.g., "9:00 AM")

  // Links to related records
  quoteId?: string;
  invoiceId?: string;
  contractId?: string;

  // Notes and attachments
  notes?: string;
  attachments?: Attachment[];

  createdAt: number;
  updatedAt: number;
};

/**
 * Company - Property management company with multiple properties
 */
export type Company = {
  id: string;
  tenantId: string;

  // Company info
  name: string;             // e.g., "ABC Property Management"
  contactName?: string;     // Primary contact person
  phone?: string;
  email?: string;

  // Billing address (where invoices go)
  billingAddress?: string;
  billingCity?: string;
  billingState?: string;
  billingZip?: string;

  // Notes and conversations
  notes?: string;
  conversations?: ConversationEntry[];
  attachments?: Attachment[];

  createdAt: number;
  updatedAt: number;
};

// ------------------ Local Dexie DB ------------------

export class AppDB extends Dexie {
  clients!: Table<Client, string>;
  quotes!: Table<Quote, string>;
  settings!: Table<Settings, string>;
  catalog!: Table<ServiceCatalog, string>;
  invoices!: Table<Invoice, string>;

  constructor() {
    super("reglaze-me-db");

    // old schema (v1) kept for safety
    this.version(1).stores({
      clients: "id, createdAt, updatedAt, name, email, phone",
      quotes: "id, clientId, createdAt, updatedAt, status, clientName",
      settings: "id",
      catalog: "id",
    });

    // new schema with invoices table
    this.version(2).stores({
      clients: "id, createdAt, updatedAt, name, email, phone",
      quotes: "id, clientId, createdAt, updatedAt, status, clientName",
      settings: "id",
      catalog: "id",
      invoices: "id, clientId, quoteId, status, createdAt, updatedAt",
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
    companyLeftLines: ["ReGlaze Me LLC", "217 3rd Ave", "Frankfort, NY 13340"],
    companyRightLines: ["reglazemellc@gmail.com", "315-525-9142"],
    theme: {
      primary: "#e8d487",
      secondary: "#151515",
      accent1: "#ffd700",
      accent2: "#b8860b",
      background: "#0b0b0b",
    },
    watermark: "",
    defaultTaxRate: 0.0,
    nextSequence: 1,
    callScript: "Hi, this is [Your Name] from ReGlaze Me LLC. I'm returning your call about refinishing services. Is now a good time to chat?",
    defaultChecklistQuestions: [
      "How many tubs/showers?",
      "Fiberglass or porcelain?",
      "Current color / desired color?",
      "Any chips, cracks, or damage?",
      "Has it been refinished before?",
      "Timeline - when do they need it done?",
      "How did they hear about us?",
    ],
    // Default answer options for each question
    defaultChecklistAnswerOptions: {
      "How many tubs/showers?": ["1", "2", "3", "4+", "Other"],
      "Fiberglass or porcelain?": ["Fiberglass", "Porcelain", "Cast Iron", "Acrylic", "Not Sure", "Other"],
      "Current color / desired color?": ["White to White", "Almond to White", "Color change", "Not Sure", "Other"],
      "Any chips, cracks, or damage?": ["None", "Minor chips", "Cracks", "Major damage", "Not Sure", "Other"],
      "Has it been refinished before?": ["No", "Yes - good condition", "Yes - peeling/failing", "Not Sure", "Other"],
      "Timeline - when do they need it done?": ["ASAP", "This week", "This month", "Flexible", "Other"],
      "How did they hear about us?": ["Google", "Facebook", "Referral", "Home Advisor", "Repeat Customer", "Other"],
    },
  };

  await setDoc(ref, defaults);
  return defaults;
}
