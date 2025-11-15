import Dexie, { Table } from 'dexie'
import { db as firestoreDb } from '../firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'

// ------------------ Shared Types ------------------

export type AttachmentType =
  | 'photo'
  | 'document'
  | 'contract'
  | 'care_sheet'

export type Attachment = {
  id: string
  name: string
  url: string
  type: AttachmentType
  createdAt: number
}

export type ConversationChannel =
  | 'call'
  | 'text'
  | 'email'
  | 'in_person'
  | 'other'

export type ConversationEntry = {
  id: string
  message: string
  channel: ConversationChannel
  createdAt: number
}

export type Reminder = {
  id: string
  clientId: string
  quoteId?: string
  remindAt: number          // timestamp (ms)
  snoozeDays?: number
  done: boolean
  note?: string
}

// ------------------ Core Entities ------------------

export type Client = {
  id: string
  name: string
  phone?: string
  email?: string
  address?: string
  notes?: string

  // existing
  photos?: string[]

  // new
  attachments?: Attachment[]
  conversations?: ConversationEntry[]
  reminders?: Reminder[]

  createdAt: number
  updatedAt: number
}

export type QuoteStatus =
  | 'pending'
  | 'approved'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'canceled'

export type LineItem = {
  id: string
  description: string
  qty: number
  unitPrice: number
  total: number
  warning?: string
}

export type Signature = {
  dataUrl: string
  signedAt?: string
}

export type Quote = {
  id: string
  clientId: string
  clientName: string

  items: LineItem[]
  services: string[]

  subtotal: number
  taxRate: number
  tax: number
  discount: number
  total: number

  notes: string
  status: QuoteStatus
  signature: Signature | null

  // new
  attachments?: Attachment[]
  sentAt?: number | null
  expiresAt?: number | null
  pdfUrl?: string | null

  createdAt: number
  updatedAt: number
}

export type InvoiceStatus = 'unpaid' | 'partial' | 'paid' | 'refunded'

export type Invoice = {
  id: string
  clientId: string
  quoteId?: string

  total: number
  amountPaid: number
  status: InvoiceStatus

  dueDate?: number
  notes?: string

  attachments?: Attachment[]

  createdAt: number
  updatedAt: number
}

export type Settings = {
  id: string
  companyLeftLines: string[]
  companyRightLines: string[]
  theme: {
    primary: string
    secondary: string
    accent1: string
    accent2: string
    background: string
  }
  defaultTaxRate: number
  nextSequence: number
  watermark?: string
}

export type ServiceCatalog = {
  id: string
  services: Array<{
    id: string
    name: string
    subservices: Array<{
      id: string
      name: string
      warning?: string
    }>
  }>
}

// ------------------ Local Dexie DB ------------------

export class AppDB extends Dexie {
  clients!: Table<Client, string>
  quotes!: Table<Quote, string>
  settings!: Table<Settings, string>
  catalog!: Table<ServiceCatalog, string>
  invoices!: Table<Invoice, string>

  constructor() {
    super('reglaze-me-db')

    // old schema (v1) kept for safety
    this.version(1).stores({
      clients: 'id, createdAt, updatedAt, name, email, phone',
      quotes: 'id, clientId, createdAt, updatedAt, status, clientName',
      settings: 'id',
      catalog: 'id',
    })

    // new schema with invoices table
    this.version(2).stores({
      clients: 'id, createdAt, updatedAt, name, email, phone',
      quotes: 'id, clientId, createdAt, updatedAt, status, clientName',
      settings: 'id',
      catalog: 'id',
      invoices: 'id, clientId, quoteId, status, createdAt, updatedAt',
    })
  }
}

export const db = new AppDB()

// ------------------ Settings Loader ------------------

export async function getOrInitSettings(): Promise<Settings> {
  const ref = doc(firestoreDb, 'settings', 'settings')
  const snap = await getDoc(ref)

  if (snap.exists()) {
    return snap.data() as Settings
  }

  const defaults: Settings = {
    id: 'settings',
    companyLeftLines: ['ReGlaze Me LLC', '217 3rd Ave', 'Frankfort, NY 13340'],
    companyRightLines: ['reglazemellc@gmail.com', '315-525-9142'],
    theme: {
      primary: '#e8d487',
      secondary: '#151515',
      accent1: '#ffd700',
      accent2: '#b8860b',
      background: '#0b0b0b',
    },
    watermark: '',
    defaultTaxRate: 0.0,
    nextSequence: 1,
  }

  await setDoc(ref, defaults)
  return defaults
}
