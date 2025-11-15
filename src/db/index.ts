import Dexie, { Table } from 'dexie'
import { db as firestoreDb } from '../firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'

// ------------------ Types ------------------

export type Client = {
  id: string
  name: string
  phone?: string
  email?: string
  address?: string
  notes?: string
  photos?: string[]
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

  constructor() {
    super('reglaze-me-db')
    this.version(1).stores({
      clients: 'id, createdAt, updatedAt, name, email, phone',
      quotes: 'id, clientId, createdAt, updatedAt, status, clientName',
      settings: 'id',
      catalog: 'id',
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
