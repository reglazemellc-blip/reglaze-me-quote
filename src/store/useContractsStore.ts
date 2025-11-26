// -------------------------------------------------------------
// useContractsStore.ts — Contract Management Store
// Handles CRUD for contracts with Firestore persistence
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
import type {
  Contract,
  ContractStatus,
  ContractSignature,
  Quote,
} from '@db/index';
import { contractTemplate, fillContractTemplate } from '@config/contractTemplate';

const contractsCol = collection(db, 'contracts');

// Helper to generate contract number: con-YYYYMMDD-####
function generateContractNumber(sequence: number): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const seq = String(sequence).padStart(4, '0');
  return `con-${y}${m}${d}-${seq}`;
}

// Simple ID helper
function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

type ContractsState = {
  contracts: Contract[];
  loading: boolean;
  nextSequence: number;

  init: () => Promise<void>;
  upsert: (contract: Partial<Contract>) => Promise<Contract>;
  remove: (id: string) => Promise<void>;

  // Create contract from quote
  createFromQuote: (quote: Quote) => Promise<Contract>;

  // Signature management
  signByClient: (contractId: string, signature: ContractSignature) => Promise<void>;
  signByContractor: (contractId: string, signature: ContractSignature) => Promise<void>;

  // Status helpers
  updateStatus: (contractId: string, status: ContractStatus) => Promise<void>;
};

export const useContractsStore = create<ContractsState>((set, get) => ({
  contracts: [],
  loading: true,
  nextSequence: 1,

  // -------------------------------------------------
  // INIT — Load all contracts
  // -------------------------------------------------
  init: async () => {
    set({ loading: true });

    const q = query(contractsCol, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);

    const contracts: Contract[] = snap.docs.map((d) => ({
      ...(d.data() as Contract),
      id: d.id,
    }));

    // Calculate next sequence based on existing contracts
    let maxSeq = 0;
    contracts.forEach((c) => {
      if (c.contractNumber) {
        const match = c.contractNumber.match(/-(\d{4})$/);
        if (match) {
          const seq = parseInt(match[1], 10);
          if (seq > maxSeq) maxSeq = seq;
        }
      }
    });

    set({ contracts, loading: false, nextSequence: maxSeq + 1 });
  },

  // -------------------------------------------------
  // UPSERT — Create or update contract
  // -------------------------------------------------
  upsert: async (data) => {
    const now = Date.now();
    const state = get();

    const id = data.id ?? createId();

    // Generate contract number for new contracts
    let contractNumber = data.contractNumber;
    if (!contractNumber && !data.id) {
      contractNumber = generateContractNumber(state.nextSequence);
      set({ nextSequence: state.nextSequence + 1 });
    }

    const contract: Contract = {
      id,
      contractNumber,
      clientId: data.clientId ?? '',
      quoteId: data.quoteId,
      invoiceId: data.invoiceId,
      clientName: data.clientName ?? '',
      clientPhone: data.clientPhone,
      clientEmail: data.clientEmail,
      clientAddress: data.clientAddress,
      templateVersion: data.templateVersion ?? contractTemplate.version,
      content: data.content ?? '',
      totalAmount: data.totalAmount ?? 0,
      depositAmount: data.depositAmount,
      appointmentDate: data.appointmentDate,
      appointmentTime: data.appointmentTime,
      clientSignature: data.clientSignature,
      contractorSignature: data.contractorSignature,
      status: data.status ?? 'draft',
      pdfUrl: data.pdfUrl,
      sentAt: data.sentAt,
      createdAt: data.createdAt ?? now,
      updatedAt: now,
    };

    const ref = doc(contractsCol, id);
    await setDoc(ref, contract, { merge: true });

    // Update local state
    const contracts = state.contracts.filter((c) => c.id !== id);
    set({ contracts: [contract, ...contracts] });

    return contract;
  },

  // -------------------------------------------------
  // REMOVE — Delete contract
  // -------------------------------------------------
  remove: async (id) => {
    await deleteDoc(doc(contractsCol, id));
    set({ contracts: get().contracts.filter((c) => c.id !== id) });
  },

  // -------------------------------------------------
  // CREATE FROM QUOTE — Generate contract from quote
  // -------------------------------------------------
  createFromQuote: async (quote) => {
    const state = get();

    const contractNumber = generateContractNumber(state.nextSequence);
    set({ nextSequence: state.nextSequence + 1 });

    const now = Date.now();
    const id = createId();

    // Build service list from quote items
    const servicesList = quote.items
      .map((item) => `• ${item.description}${item.warning ? ` (${item.warning})` : ''}`)
      .join('\n');

    const depositAmount = Math.round(quote.total * 0.5 * 100) / 100; // 50% deposit
    const balanceAmount = quote.total - depositAmount;

    // Fill template with quote data
    const variables = {
      clientName: quote.clientName,
      clientAddress: quote.clientAddress ?? '',
      contractDate: new Date().toLocaleDateString(),
      servicesList,
      totalAmount: `$${quote.total.toFixed(2)}`,
      depositAmount: `$${depositAmount.toFixed(2)}`,
      balanceAmount: `$${balanceAmount.toFixed(2)}`,
      appointmentDate: quote.appointmentDate ?? 'TBD',
      appointmentTime: quote.appointmentTime ?? 'TBD',
    };

    // Build full contract content from template sections
    const content = contractTemplate.sections
      .map((section) => {
        const filledContent = fillContractTemplate(section.content, variables);
        return `## ${section.title}\n\n${filledContent}`;
      })
      .join('\n\n');

    const contract: Contract = {
      id,
      contractNumber,
      clientId: quote.clientId,
      quoteId: quote.id,
      clientName: quote.clientName,
      clientPhone: quote.clientPhone,
      clientEmail: quote.clientEmail,
      clientAddress: quote.clientAddress,
      templateVersion: contractTemplate.version,
      content,
      totalAmount: quote.total,
      depositAmount,
      appointmentDate: quote.appointmentDate ?? undefined,
      appointmentTime: quote.appointmentTime ?? undefined,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };

    const ref = doc(contractsCol, id);
    await setDoc(ref, contract);

    set({ contracts: [contract, ...state.contracts] });

    return contract;
  },

  // -------------------------------------------------
  // SIGN BY CLIENT
  // -------------------------------------------------
  signByClient: async (contractId, signature) => {
    const state = get();
    const contract = state.contracts.find((c) => c.id === contractId);
    if (!contract) return;

    const newStatus: ContractStatus = contract.contractorSignature
      ? 'fully_signed'
      : 'client_signed';

    await get().upsert({
      id: contractId,
      clientSignature: signature,
      status: newStatus,
    });
  },

  // -------------------------------------------------
  // SIGN BY CONTRACTOR
  // -------------------------------------------------
  signByContractor: async (contractId, signature) => {
    const state = get();
    const contract = state.contracts.find((c) => c.id === contractId);
    if (!contract) return;

    const newStatus: ContractStatus = contract.clientSignature
      ? 'fully_signed'
      : contract.status === 'draft'
        ? 'sent'
        : contract.status;

    await get().upsert({
      id: contractId,
      contractorSignature: signature,
      status: newStatus,
    });
  },

  // -------------------------------------------------
  // UPDATE STATUS
  // -------------------------------------------------
  updateStatus: async (contractId, status) => {
    await get().upsert({ id: contractId, status });
  },
}));
