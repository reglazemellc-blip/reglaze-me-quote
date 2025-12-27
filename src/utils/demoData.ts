/**
 * Demo/Sample Data Loader
 * 
 * Generates realistic sample data for new users:
 * - 5 demo clients (with photos, conversations, reminders)
 * - 10 demo quotes (various statuses and workflow stages)
 * - 3 scheduled jobs (upcoming appointments)
 * 
 * All demo data is marked with `isDemo: true` flag for easy deletion.
 */

import { collection, doc, setDoc, getDocs, query, where, deleteDoc } from 'firebase/firestore'
import { db } from '../firebase'
import type { Client, Quote, ConversationEntry, Attachment, ChecklistItem, Reminder } from '@db/index'

const DEMO_FLAG = '__DEMO_DATA__'

// ============================================================
// DEMO CLIENTS
// ============================================================

const DEMO_CLIENTS: Partial<Client>[] = [
  {
    id: `${DEMO_FLAG}_client_1`,
    name: 'Sarah Johnson',
    phone: '(555) 123-4567',
    email: 'sarah.johnson@email.com',
    address: '123 Maple Street',
    city: 'Springfield',
    state: 'IL',
    zip: '62701',
    workflowStatus: 'scheduled',
    scheduledDate: '2026-01-15',
    scheduledTime: '9:00 AM',
    notes: 'Referred by previous customer. Very interested in bathtub and tile refinishing.',
    conversations: [
      {
        id: 'conv_1',
        message: 'Initial inquiry via phone. Wants quote for master bathroom tub and tile.',
        channel: 'call',
        createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago
      },
      {
        id: 'conv_2',
        message: 'Sent photos of current condition. Some minor chips on tub, grout needs repair.',
        channel: 'email',
        createdAt: Date.now() - 6 * 24 * 60 * 60 * 1000,
      },
      {
        id: 'conv_3',
        message: 'Approved quote. Scheduled for January 15th.',
        channel: 'call',
        createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
      },
    ],
    checklist: [
      {
        id: 'what-refinishing',
        question: 'What are we refinishing?',
        checked: true,
        answer: 'Tub & Shower',
        answerType: 'dropdown',
        checkedAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
        answerOptions: ['Tub', 'Shower', 'Tub & Shower', 'Tile', 'Countertop', 'Other'],
      },
      {
        id: 'condition',
        question: 'Any chips, cracks, peeling, rust, or old coatings?',
        checked: true,
        answer: 'Minor chips',
        answerType: 'dropdown',
        checkedAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
        answerOptions: ['None', 'Minor chips', 'Cracks', 'Peeling/rust', 'Previous coating', 'Other'],
      },
      {
        id: 'color',
        question: 'Keeping white or changing color?',
        checked: true,
        answer: 'Keeping white',
        answerType: 'dropdown',
        checkedAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
        answerOptions: ['Keeping white', 'Color change', 'Not sure', 'Other'],
      },
    ],
    createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
  },
  {
    id: `${DEMO_FLAG}_client_2`,
    name: 'Michael Chen',
    phone: '(555) 234-5678',
    email: 'mchen@email.com',
    address: '456 Oak Avenue',
    city: 'Springfield',
    state: 'IL',
    zip: '62702',
    workflowStatus: 'waiting_prejob',
    notes: 'Property manager at Oak Grove Apartments. Multiple units need refinishing.',
    conversations: [
      {
        id: 'conv_1',
        message: 'Inquiry about bulk pricing for 5 units. Sent commercial quote.',
        channel: 'email',
        createdAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
      },
      {
        id: 'conv_2',
        message: 'Approved quote for first unit. Waiting on pre-job checklist.',
        channel: 'call',
        createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
      },
    ],
    documentTracking: {
      preJobSent: Date.now() - 4 * 24 * 60 * 60 * 1000,
    },
    reminders: [
      {
        id: 'reminder_1',
        clientId: `${DEMO_FLAG}_client_2`,
        remindAt: Date.now() + 2 * 24 * 60 * 60 * 1000, // 2 days from now
        done: false,
        note: 'Follow up on pre-job checklist',
      },
    ],
    createdAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 4 * 24 * 60 * 60 * 1000,
  },
  {
    id: `${DEMO_FLAG}_client_3`,
    name: 'Emily Rodriguez',
    phone: '(555) 345-6789',
    email: 'emily.rodriguez@email.com',
    address: '789 Pine Road',
    city: 'Springfield',
    state: 'IL',
    zip: '62703',
    workflowStatus: 'new',
    notes: 'New lead from Google search. Interested in kitchen countertop refinishing.',
    conversations: [
      {
        id: 'conv_1',
        message: 'Left voicemail. Awaiting callback.',
        channel: 'call',
        createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
      },
    ],
    checklist: [
      {
        id: 'what-refinishing',
        question: 'What are we refinishing?',
        checked: true,
        answer: 'Countertop',
        answerType: 'dropdown',
        checkedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
        answerOptions: ['Tub', 'Shower', 'Tub & Shower', 'Tile', 'Countertop', 'Other'],
      },
    ],
    reminders: [
      {
        id: 'reminder_1',
        clientId: `${DEMO_FLAG}_client_3`,
        remindAt: Date.now() + 1 * 24 * 60 * 60 * 1000, // tomorrow
        done: false,
        note: 'Follow up on initial contact',
      },
    ],
    createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
  },
  {
    id: `${DEMO_FLAG}_client_4`,
    name: 'David Thompson',
    phone: '(555) 456-7890',
    email: 'dthompson@email.com',
    address: '321 Birch Lane',
    city: 'Springfield',
    state: 'IL',
    zip: '62704',
    workflowStatus: 'completed',
    notes: 'Completed job. Very happy with results. Potential referral source.',
    conversations: [
      {
        id: 'conv_1',
        message: 'Initial quote approved. Job completed on schedule.',
        channel: 'call',
        createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
      },
      {
        id: 'conv_2',
        message: 'Customer very satisfied. Left 5-star review. Asked about care instructions.',
        channel: 'in_person',
        createdAt: Date.now() - 28 * 24 * 60 * 60 * 1000,
      },
    ],
    createdAt: Date.now() - 35 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 28 * 24 * 60 * 60 * 1000,
  },
  {
    id: `${DEMO_FLAG}_client_5`,
    name: 'Lisa Anderson',
    phone: '(555) 567-8901',
    email: 'lisa.anderson@email.com',
    address: '654 Elm Street',
    city: 'Springfield',
    state: 'IL',
    zip: '62705',
    workflowStatus: 'docs_sent',
    scheduledDate: '2026-01-20',
    scheduledTime: '1:00 PM',
    notes: 'Bathroom remodel - tub, tile, and sink refinishing. Quote sent, awaiting approval.',
    conversations: [
      {
        id: 'conv_1',
        message: 'Site visit completed. Took photos and measurements.',
        channel: 'in_person',
        createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
      },
      {
        id: 'conv_2',
        message: 'Quote sent via email. Customer said she needs to discuss with husband.',
        channel: 'email',
        createdAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
      },
    ],
    documentTracking: {
      prepCareSent: Date.now() - 8 * 24 * 60 * 60 * 1000,
    },
    reminders: [
      {
        id: 'reminder_1',
        clientId: `${DEMO_FLAG}_client_5`,
        remindAt: Date.now() + 3 * 24 * 60 * 60 * 1000, // 3 days from now
        done: false,
        note: 'Follow up on quote approval',
      },
    ],
    createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
  },
]

// ============================================================
// DEMO QUOTES
// ============================================================

const DEMO_QUOTES: Partial<Quote>[] = [
  {
    id: `${DEMO_FLAG}_quote_1`,
    clientId: `${DEMO_FLAG}_client_1`,
    clientName: 'Sarah Johnson',
    clientPhone: '(555) 123-4567',
    clientEmail: 'sarah.johnson@email.com',
    clientAddress: '123 Maple Street, Springfield, IL 62701',
    quoteNumber: 'Q-2026-001',
    status: 'approved',
    workflowStatus: 'scheduled',
    scheduledDate: '2026-01-15',
    scheduledTime: '9:00 AM',
    items: [
      {
        id: 'item_1',
        description: 'Bathtub Surface Prep',
        qty: 1,
        unitPrice: 150,
        total: 150,
        serviceDescription: 'Clean and prepare surface for coating',
      },
      {
        id: 'item_2',
        description: 'Bathtub Chip Repair',
        qty: 1,
        unitPrice: 100,
        total: 100,
        warning: 'Extra time may be required for curing.',
      },
      {
        id: 'item_3',
        description: 'Bathtub Standard Re-Glaze',
        qty: 1,
        unitPrice: 450,
        total: 450,
      },
      {
        id: 'item_4',
        description: 'Tile Grout Repair',
        qty: 1,
        unitPrice: 125,
        total: 125,
        warning: 'Grout must be fully dried prior to application.',
      },
      {
        id: 'item_5',
        description: 'Tile Standard Refinish',
        qty: 1,
        unitPrice: 350,
        total: 350,
      },
    ],
    services: ['tub', 'tile'],
    subtotal: 1175,
    taxRate: 0.08,
    tax: 94,
    discount: 0,
    total: 1269,
    notes: 'Master bathroom refinishing. Customer selected standard white finish.',
    attachments: [],
    pdfUrl: null,
    sentAt: Date.now() - 6 * 24 * 60 * 60 * 1000,
    expiresAt: Date.now() + 24 * 24 * 60 * 60 * 1000,
    createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
    jobsiteReadyAcknowledged: true,
    jobsiteReadyAcknowledgedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
  },
  {
    id: `${DEMO_FLAG}_quote_2`,
    clientId: `${DEMO_FLAG}_client_2`,
    clientName: 'Michael Chen',
    clientPhone: '(555) 234-5678',
    clientEmail: 'mchen@email.com',
    clientAddress: '456 Oak Avenue, Springfield, IL 62702',
    quoteNumber: 'Q-2026-002',
    status: 'approved',
    workflowStatus: 'waiting_prejob',
    items: [
      {
        id: 'item_1',
        description: 'Bathtub Standard Re-Glaze',
        qty: 1,
        unitPrice: 450,
        total: 450,
      },
    ],
    services: ['tub'],
    subtotal: 450,
    taxRate: 0.08,
    tax: 36,
    discount: 50, // bulk discount
    total: 436,
    notes: 'Unit 3B - Oak Grove Apartments. First of 5 units. Bulk discount applied.',
    attachments: [],
    pdfUrl: null,
    sentAt: Date.now() - 12 * 24 * 60 * 60 * 1000,
    expiresAt: Date.now() + 18 * 24 * 60 * 60 * 1000,
    createdAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    documentTracking: {
      preJobSent: Date.now() - 4 * 24 * 60 * 60 * 1000,
    },
  },
  {
    id: `${DEMO_FLAG}_quote_3`,
    clientId: `${DEMO_FLAG}_client_3`,
    clientName: 'Emily Rodriguez',
    clientPhone: '(555) 345-6789',
    clientEmail: 'emily.rodriguez@email.com',
    clientAddress: '789 Pine Road, Springfield, IL 62703',
    quoteNumber: 'Q-2026-003',
    status: 'pending',
    workflowStatus: 'new',
    items: [
      {
        id: 'item_1',
        description: 'Countertop Standard Refinish',
        qty: 1,
        unitPrice: 550,
        total: 550,
      },
    ],
    services: ['countertop'],
    subtotal: 550,
    taxRate: 0.08,
    tax: 44,
    discount: 0,
    total: 594,
    notes: 'Kitchen countertop refinishing. Awaiting customer response.',
    attachments: [],
    pdfUrl: null,
    sentAt: null,
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
  },
  {
    id: `${DEMO_FLAG}_quote_4`,
    clientId: `${DEMO_FLAG}_client_4`,
    clientName: 'David Thompson',
    clientPhone: '(555) 456-7890',
    clientEmail: 'dthompson@email.com',
    clientAddress: '321 Birch Lane, Springfield, IL 62704',
    quoteNumber: 'Q-2025-098',
    status: 'completed',
    workflowStatus: 'completed',
    items: [
      {
        id: 'item_1',
        description: 'Bathtub Premium Re-Glaze',
        qty: 1,
        unitPrice: 650,
        total: 650,
      },
      {
        id: 'item_2',
        description: 'Shower Pan Anti-Slip Treatment',
        qty: 1,
        unitPrice: 200,
        total: 200,
        warning: 'Requires 48 hours to cure completely.',
      },
    ],
    services: ['tub', 'shower'],
    subtotal: 850,
    taxRate: 0.08,
    tax: 68,
    discount: 0,
    total: 918,
    notes: 'Premium finish with extended warranty. Job completed successfully.',
    attachments: [],
    pdfUrl: null,
    sentAt: Date.now() - 35 * 24 * 60 * 60 * 1000,
    expiresAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    createdAt: Date.now() - 35 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 28 * 24 * 60 * 60 * 1000,
    jobsiteReadyAcknowledged: true,
    waterShutoffElected: false,
  },
  {
    id: `${DEMO_FLAG}_quote_5`,
    clientId: `${DEMO_FLAG}_client_5`,
    clientName: 'Lisa Anderson',
    clientPhone: '(555) 567-8901',
    clientEmail: 'lisa.anderson@email.com',
    clientAddress: '654 Elm Street, Springfield, IL 62705',
    quoteNumber: 'Q-2026-004',
    status: 'pending',
    workflowStatus: 'docs_sent',
    scheduledDate: '2026-01-20',
    scheduledTime: '1:00 PM',
    items: [
      {
        id: 'item_1',
        description: 'Bathtub Standard Re-Glaze',
        qty: 1,
        unitPrice: 450,
        total: 450,
      },
      {
        id: 'item_2',
        description: 'Tile Standard Refinish',
        qty: 1,
        unitPrice: 350,
        total: 350,
      },
      {
        id: 'item_3',
        description: 'Sink Standard Refinish',
        qty: 1,
        unitPrice: 275,
        total: 275,
      },
    ],
    services: ['tub', 'tile', 'sink'],
    subtotal: 1075,
    taxRate: 0.08,
    tax: 86,
    discount: 100, // package discount
    total: 1061,
    notes: 'Full bathroom remodel package. Package discount applied. Awaiting approval.',
    attachments: [],
    pdfUrl: null,
    sentAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
    expiresAt: Date.now() + 22 * 24 * 60 * 60 * 1000,
    createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
    documentTracking: {
      prepCareSent: Date.now() - 8 * 24 * 60 * 60 * 1000,
    },
  },
  // Additional quotes for variety
  {
    id: `${DEMO_FLAG}_quote_6`,
    clientId: `${DEMO_FLAG}_client_1`,
    clientName: 'Sarah Johnson',
    clientPhone: '(555) 123-4567',
    clientEmail: 'sarah.johnson@email.com',
    clientAddress: '123 Maple Street, Springfield, IL 62701',
    quoteNumber: 'Q-2025-099',
    status: 'completed',
    workflowStatus: 'invoiced',
    items: [
      {
        id: 'item_1',
        description: 'Sink Double Basin Refinish',
        qty: 1,
        unitPrice: 375,
        total: 375,
      },
    ],
    services: ['sink'],
    subtotal: 375,
    taxRate: 0.08,
    tax: 30,
    discount: 0,
    total: 405,
    notes: 'Kitchen sink refinishing - completed as separate job.',
    attachments: [],
    pdfUrl: null,
    sentAt: Date.now() - 45 * 24 * 60 * 60 * 1000,
    expiresAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
    createdAt: Date.now() - 45 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 40 * 24 * 60 * 60 * 1000,
  },
  {
    id: `${DEMO_FLAG}_quote_7`,
    clientId: `${DEMO_FLAG}_client_2`,
    clientName: 'Michael Chen',
    clientPhone: '(555) 234-5678',
    clientEmail: 'mchen@email.com',
    clientAddress: '456 Oak Avenue, Springfield, IL 62702',
    quoteNumber: 'Q-2026-005',
    status: 'pending',
    workflowStatus: 'new',
    items: [
      {
        id: 'item_1',
        description: 'Bathtub Standard Re-Glaze',
        qty: 4,
        unitPrice: 450,
        total: 1800,
      },
    ],
    services: ['tub'],
    subtotal: 1800,
    taxRate: 0.08,
    tax: 144,
    discount: 200, // bulk discount
    total: 1744,
    notes: 'Units 4A, 5B, 6C, 7D - Oak Grove Apartments. Quote for remaining units.',
    attachments: [],
    pdfUrl: null,
    sentAt: null,
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
  },
  {
    id: `${DEMO_FLAG}_quote_8`,
    clientId: `${DEMO_FLAG}_client_3`,
    clientName: 'Emily Rodriguez',
    clientPhone: '(555) 345-6789',
    clientEmail: 'emily.rodriguez@email.com',
    clientAddress: '789 Pine Road, Springfield, IL 62703',
    quoteNumber: 'Q-2026-006',
    status: 'pending',
    workflowStatus: 'new',
    items: [
      {
        id: 'item_1',
        description: 'Countertop Premium Stone Effect',
        qty: 1,
        unitPrice: 750,
        total: 750,
      },
    ],
    services: ['countertop'],
    subtotal: 750,
    taxRate: 0.08,
    tax: 60,
    discount: 0,
    total: 810,
    notes: 'Alternate quote with premium finish option.',
    attachments: [],
    pdfUrl: null,
    sentAt: null,
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
  },
  {
    id: `${DEMO_FLAG}_quote_9`,
    clientId: `${DEMO_FLAG}_client_5`,
    clientName: 'Lisa Anderson',
    clientPhone: '(555) 567-8901',
    clientEmail: 'lisa.anderson@email.com',
    clientAddress: '654 Elm Street, Springfield, IL 62705',
    quoteNumber: 'Q-2026-007',
    status: 'canceled',
    workflowStatus: 'new',
    items: [
      {
        id: 'item_1',
        description: 'Tile Custom Color Match',
        qty: 1,
        unitPrice: 450,
        total: 450,
      },
    ],
    services: ['tile'],
    subtotal: 450,
    taxRate: 0.08,
    tax: 36,
    discount: 0,
    total: 486,
    notes: 'Customer decided against color match. Went with standard white instead.',
    attachments: [],
    pdfUrl: null,
    sentAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
    expiresAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    createdAt: Date.now() - 20 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 12 * 24 * 60 * 60 * 1000,
  },
  {
    id: `${DEMO_FLAG}_quote_10`,
    clientId: `${DEMO_FLAG}_client_4`,
    clientName: 'David Thompson',
    clientPhone: '(555) 456-7890',
    clientEmail: 'dthompson@email.com',
    clientAddress: '321 Birch Lane, Springfield, IL 62704',
    quoteNumber: 'Q-2026-008',
    status: 'pending',
    workflowStatus: 'ready_to_schedule',
    items: [
      {
        id: 'item_1',
        description: 'Tile Standard Refinish',
        qty: 1,
        unitPrice: 350,
        total: 350,
      },
    ],
    services: ['tile'],
    subtotal: 350,
    taxRate: 0.08,
    tax: 28,
    discount: 25, // repeat customer discount
    total: 353,
    notes: 'Guest bathroom tile. Repeat customer - discount applied. Ready to schedule.',
    attachments: [],
    pdfUrl: null,
    sentAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    expiresAt: Date.now() + 25 * 24 * 60 * 60 * 1000,
    createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    jobsiteReadyAcknowledged: true,
    jobsiteReadyAcknowledgedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
  },
]

// ============================================================
// LOAD SAMPLE DATA
// ============================================================

export async function loadSampleData(tenantId: string): Promise<{ success: boolean; message: string }> {
  try {
    // Check if sample data already exists
    const clientsCol = collection(db, 'clients')
    const existingDemo = await getDocs(
      query(clientsCol, where('id', '>=', DEMO_FLAG), where('id', '<=', DEMO_FLAG + '\uf8ff'))
    )

    if (!existingDemo.empty) {
      return {
        success: false,
        message: 'Sample data already loaded. Delete existing sample data first.',
      }
    }

    // Load demo clients
    for (const client of DEMO_CLIENTS) {
      const clientRef = doc(db, 'clients', client.id!)
      await setDoc(clientRef, {
        ...client,
        tenantId,
        createdAt: client.createdAt || Date.now(),
        updatedAt: client.updatedAt || Date.now(),
      })
    }

    // Load demo quotes
    for (const quote of DEMO_QUOTES) {
      const quoteRef = doc(db, 'quotes', quote.id!)
      await setDoc(quoteRef, {
        ...quote,
        tenantId,
        createdAt: quote.createdAt || Date.now(),
        updatedAt: quote.updatedAt || Date.now(),
      })
    }

    return {
      success: true,
      message: `Successfully loaded ${DEMO_CLIENTS.length} sample clients and ${DEMO_QUOTES.length} sample quotes.`,
    }
  } catch (error) {
    console.error('Error loading sample data:', error)
    return {
      success: false,
      message: `Failed to load sample data: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

// ============================================================
// DELETE SAMPLE DATA
// ============================================================

export async function deleteSampleData(): Promise<{ success: boolean; message: string }> {
  try {
    let deletedClients = 0
    let deletedQuotes = 0

    // Delete demo clients
    const clientsCol = collection(db, 'clients')
    const demoClients = await getDocs(
      query(clientsCol, where('id', '>=', DEMO_FLAG), where('id', '<=', DEMO_FLAG + '\uf8ff'))
    )

    for (const docSnap of demoClients.docs) {
      await deleteDoc(doc(db, 'clients', docSnap.id))
      deletedClients++
    }

    // Delete demo quotes
    const quotesCol = collection(db, 'quotes')
    const demoQuotes = await getDocs(
      query(quotesCol, where('id', '>=', DEMO_FLAG), where('id', '<=', DEMO_FLAG + '\uf8ff'))
    )

    for (const docSnap of demoQuotes.docs) {
      await deleteDoc(doc(db, 'quotes', docSnap.id))
      deletedQuotes++
    }

    if (deletedClients === 0 && deletedQuotes === 0) {
      return {
        success: false,
        message: 'No sample data found to delete.',
      }
    }

    return {
      success: true,
      message: `Successfully deleted ${deletedClients} sample clients and ${deletedQuotes} sample quotes.`,
    }
  } catch (error) {
    console.error('Error deleting sample data:', error)
    return {
      success: false,
      message: `Failed to delete sample data: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

// ============================================================
// CHECK IF SAMPLE DATA EXISTS
// ============================================================

export async function hasSampleData(): Promise<boolean> {
  try {
    const clientsCol = collection(db, 'clients')
    const demoClients = await getDocs(
      query(clientsCol, where('id', '>=', DEMO_FLAG), where('id', '<=', DEMO_FLAG + '\uf8ff'))
    )

    return !demoClients.empty
  } catch (error) {
    console.error('Error checking for sample data:', error)
    return false
  }
}
