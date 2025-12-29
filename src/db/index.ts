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
  answerType?: 'text' | 'number' | 'date' | 'dropdown' | 'file';
  // Predefined answer options (if empty, just shows text input)
  answerOptions?: string[];
};

// Default checklist questions for fallback
export const DEFAULT_CHECKLIST_QUESTIONS: ChecklistItem[] = [
  {
    id: "what-are-we-refinishing",
    question: "What are we refinishing?",
    checked: false,
    answerType: "dropdown",
    answerOptions: ["Tub", "Shower", "Tub & Shower", "Tile", "Countertop", "Other"],
  },
  {
    id: "chips-cracks-peeling",
    question: "Any chips, cracks, peeling, rust, or old coatings?",
    checked: false,
    answerType: "dropdown",
    answerOptions: ["None", "Minor chips", "Cracks", "Peeling/rust", "Previous coating", "Other"],
  },
  {
    id: "color-change",
    question: "Keeping white or changing color?",
    checked: false,
    answerType: "dropdown",
    answerOptions: ["Keeping white", "Color change", "Not sure", "Other"],
  },
  {
    id: "home-or-rental",
    question: "Home or rental?",
    checked: false,
    answerType: "dropdown",
    answerOptions: ["Own home", "Rental property", "Other"],
  },
  {
    id: "job-town",
    question: "What town is the job in?",
    checked: false,
    answerType: "text",
    answerOptions: [],
  },
  {
    id: "how-did-they-hear",
    question: "How did they hear about us?",
    checked: false,
    answerType: "dropdown",
    answerOptions: ["Google", "Facebook", "Referral", "Home Advisor", "Repeat Customer", "Other"],
  },
];

// Default property manager checklist questions
export const DEFAULT_PROPERTY_MANAGER_QUESTIONS: ChecklistItem[] = [
  {
    id: "property-unit",
    question: "Property name and unit number?",
    checked: false,
    answerType: "text",
    answerOptions: [],
  },
  {
    id: "vacant-occupied",
    question: "Vacant or occupied?",
    checked: false,
    answerType: "dropdown",
    answerOptions: ["Vacant", "Occupied - can schedule", "Occupied - need notice", "Other"],
  },
  {
    id: "condition",
    question: "Condition - chips, cracks, rust, previous coatings?",
    checked: false,
    answerType: "dropdown",
    answerOptions: ["Good condition", "Minor chips", "Cracks/rust", "Previous coating - peeling", "Other"],
  },
  {
    id: "white-or-color",
    question: "Standard white or color match?",
    checked: false,
    answerType: "dropdown",
    answerOptions: ["Standard white", "Almond", "Color match needed", "Other"],
  },
  {
    id: "timeline",
    question: "Timeline / move-in date?",
    checked: false,
    answerType: "dropdown",
    answerOptions: ["ASAP", "This week", "End of month", "Flexible", "Other"],
  },
  {
    id: "access",
    question: "Who handles access - maintenance or tenant?",
    checked: false,
    answerType: "dropdown",
    answerOptions: ["Maintenance", "Tenant", "Property manager", "Other"],
  },
];

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
tenantId: string
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
  

};

export type ContractStatus = "draft" | "sent" | "signed" | "completed" | "canceled";

export type Contract = {
  id: string
  clientId: string
  tenantId: string

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
  // Legacy single call script (kept for backwards compatibility)
  callScript?: string;
  // Homeowner scripts
  homeownerScripts?: {
    outbound: string;
    inbound: string;
    voicemail: string;
    followUpText: string;
  };
  // Property Manager scripts
  propertyManagerScripts?: {
    outbound: string;
    inbound: string;
    voicemail: string;
    followUpText: string;
  };
  // Default intake checklist questions for new clients (full objects)
  defaultChecklistQuestions?: ChecklistItem[];
  // Property Manager intake questions (separate flow)
  propertyManagerChecklistQuestions?: ChecklistItem[];
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
    callScript: "Hi, this is Joe from ReGlaze Me LLC. I'm returning your call about refinishing your tub or shower. Did I catch you at a bad time?",
    // Homeowner scripts
    homeownerScripts: {
      outbound: "Hi, this is Joe from ReGlaze Me LLC. I'm returning your call about refinishing your tub or shower.\nDid I catch you at a bad time?\n\nIf no:\n\"Perfect. I'll keep this quick and ask a few questions so I can give you accurate pricing.\"",
      inbound: "ReGlaze Me LLC, this is Joe.\n\nIf they hesitate:\n\"How can I help you today?\"",
      voicemail: "Hi, this is Joe with ReGlaze Me LLC returning your call about refinishing services.\nYou can call or text me back at 315-525-9142.\nAgain, Joe with ReGlaze Me LLC.",
      followUpText: "Hi, this is Joe with ReGlaze Me LLC. I just tried calling you back about refinishing your tub or shower. You can call or text me here when it's convenient.",
    },
    // Property Manager scripts
    propertyManagerScripts: {
      outbound: "Hi, this is Joe with ReGlaze Me LLC returning your call about unit refinishing.\nIs now a good time to go over details?\n\nIf yes:\n\"Great. I just need unit info and condition so I can price this correctly.\"",
      inbound: "ReGlaze Me LLC, Joe speaking.\n\nThen immediately:\n\"Is this for a single unit or multiple units?\"",
      voicemail: "Hi, this is Joe with ReGlaze Me LLC returning your call about unit refinishing.\nYou can call or text me back at 315-525-9142.\nAgain, Joe with ReGlaze Me LLC.",
      followUpText: "Hi, this is Joe with ReGlaze Me LLC following up on your unit refinishing request. Let me know the unit number and condition when you have a moment.",
    },
    defaultChecklistQuestions: DEFAULT_CHECKLIST_QUESTIONS,
    propertyManagerChecklistQuestions: DEFAULT_PROPERTY_MANAGER_QUESTIONS,
    // Default answer options for each question
    defaultChecklistAnswerOptions: {
      "What are we refinishing?": ["Tub", "Shower", "Tub & Shower", "Tile", "Countertop", "Other"],
      "Any chips, cracks, peeling, rust, or old coatings?": ["None", "Minor chips", "Cracks", "Peeling/rust", "Previous coating", "Other"],
      "Keeping white or changing color?": ["Keeping white", "Color change", "Not sure", "Other"],
      "Home or rental?": ["Own home", "Rental property", "Other"],
      "What town is the job in?": ["Other"],
      "How did they hear about us?": ["Google", "Facebook", "Referral", "Home Advisor", "Repeat Customer", "Other"],
      // Property Manager options
      "Property name and unit number?": ["Other"],
      "Vacant or occupied?": ["Vacant", "Occupied - can schedule", "Occupied - need notice", "Other"],
      "Condition - chips, cracks, rust, previous coatings?": ["Good condition", "Minor chips", "Cracks/rust", "Previous coating - peeling", "Other"],
      "Standard white or color match?": ["Standard white", "Almond", "Color match needed", "Other"],
      "Timeline / move-in date?": ["ASAP", "This week", "End of month", "Flexible", "Other"],
      "Who handles access - maintenance or tenant?": ["Maintenance", "Tenant", "Property manager", "Other"],
    },
  };

  await setDoc(ref, defaults);
  return defaults;
}
