// -------------------------------------------------------------
// useContractsStore.ts — Contracts Store with Firestore
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
import type { Contract, ContractStatus, Signature } from "@db/index";

const contractsCol = collection(db, "contracts");

// Contract ID format: con-YYYYMMDD-####
export function formatContractId(d: Date, seq: number) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `con-${yyyy}${mm}${dd}-${String(seq).padStart(4, "0")}`;
}

type ContractsState = {
  contracts: Contract[];
  loading: boolean;

  init: () => Promise<void>;
  getById: (id: string) => Promise<Contract | null>;
  upsert: (contract: Partial<Contract>) => Promise<Contract>;
  remove: (id: string) => Promise<void>;
  updateStatus: (id: string, status: ContractStatus) => Promise<void>;
  sign: (id: string, signature: Signature) => Promise<void>;
};

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

// Default contract template
const DEFAULT_CONTRACT_TEMPLATE = `
<h2>Service Agreement</h2>

<p>This Service Agreement ("Agreement") is entered into between <strong>ReGlaze Me LLC</strong> ("Company") and the Client listed below.</p>

<h3>Client Information</h3>
<p>Name: {{clientName}}<br/>
Phone: {{clientPhone}}<br/>
Email: {{clientEmail}}<br/>
Address: {{clientAddress}}</p>

<h3>Scope of Work</h3>
<p>The Company agrees to provide the services as outlined in the associated quote/invoice.</p>

<h3>Terms and Conditions</h3>
<ul>
  <li>Payment is due upon completion of services unless otherwise agreed.</li>
  <li>The Company is not liable for pre-existing damage to surfaces.</li>
  <li>A minimum 24-hour notice is required for cancellations.</li>
</ul>

<h3>Agreement</h3>
<p>By signing below, the Client agrees to the terms and conditions of this Agreement.</p>
`.trim();

export const useContractsStore = create<ContractsState>((set, get) => ({
  contracts: [],
  loading: true,

  // Load all contracts
  init: async () => {
    set({ loading: true });
    const q = query(contractsCol, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);

    const contracts: Contract[] = snap.docs.map((d) => ({
      ...(d.data() as Contract),
      id: d.id,
    }));

    set({ contracts, loading: false });
  },

  // Get single contract by ID
  getById: async (id: string) => {
    const ref = doc(contractsCol, id);
    const snap = await getDoc(ref);
    return snap.exists() ? (snap.data() as Contract) : null;
  },

  // Create or update contract
  upsert: async (data: Partial<Contract>) => {
    const now = Date.now();
    const id = data.id ?? createId();

    const existing = get().contracts.find((c) => c.id === id);

    // Generate a default contract number if not provided
    const defaultContractNumber = formatContractId(new Date(), Date.now() % 10000);

    const contract: Contract = {
      id,
      contractNumber: data.contractNumber ?? existing?.contractNumber ?? defaultContractNumber,
      clientId: data.clientId ?? existing?.clientId ?? "",
      quoteId: data.quoteId ?? existing?.quoteId,
      invoiceId: data.invoiceId ?? existing?.invoiceId,
      clientName: data.clientName ?? existing?.clientName,
      clientPhone: data.clientPhone ?? existing?.clientPhone,
      clientEmail: data.clientEmail ?? existing?.clientEmail,
      clientAddress: data.clientAddress ?? existing?.clientAddress,
      title: data.title ?? existing?.title ?? "Service Agreement",
      content: data.content ?? existing?.content ?? DEFAULT_CONTRACT_TEMPLATE,
      terms: data.terms ?? existing?.terms,
      status: data.status ?? existing?.status ?? "draft",
      signature: data.signature ?? existing?.signature,
      signedAt: data.signedAt ?? existing?.signedAt,
      attachments: data.attachments ?? existing?.attachments ?? [],
      pdfUrl: data.pdfUrl ?? existing?.pdfUrl ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    const ref = doc(contractsCol, id);
    await setDoc(ref, contract, { merge: true });

    // Update local state
    const contracts = get().contracts.filter((c) => c.id !== id);
    set({ contracts: [contract, ...contracts] });

    return contract;
  },

  // Delete contract
  remove: async (id: string) => {
    await deleteDoc(doc(contractsCol, id));
    set({ contracts: get().contracts.filter((c) => c.id !== id) });
  },

  // Update contract status
  updateStatus: async (id: string, status: ContractStatus) => {
    const ref = doc(contractsCol, id);
    const now = Date.now();
    await setDoc(ref, { status, updatedAt: now }, { merge: true });

    const contracts = get().contracts.map((c) =>
      c.id === id ? { ...c, status, updatedAt: now } : c
    );
    set({ contracts });
  },

  // Sign a contract
  sign: async (id: string, signature: Signature) => {
    const ref = doc(contractsCol, id);
    const now = Date.now();
    await setDoc(
      ref,
      { signature, signedAt: now, status: "signed", updatedAt: now },
      { merge: true }
    );

    const contracts = get().contracts.map((c) =>
      c.id === id
        ? { ...c, signature, signedAt: now, status: "signed" as ContractStatus, updatedAt: now }
        : c
    );
    set({ contracts });
  },
}));

export { DEFAULT_CONTRACT_TEMPLATE };
