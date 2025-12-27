// -------------------------------------------------------------
// useServicesStore.ts — Service Library Store
// -------------------------------------------------------------

import { create } from "zustand";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../firebase";

// --------------------
// Types
// --------------------
export type Service = {
  id: string;
  name: string;
  description?: string;
  warning?: string;
  unitPrice: number;
  category?: string | null;
  taxable?: boolean;
  createdAt: number;
  updatedAt: number;
};

// --------------------
// Firestore reference
// --------------------
const servicesCol = collection(db, "services");

// --------------------
// Store
// --------------------
type ServicesState = {
  services: Service[];
  loading: boolean;

  init: () => Promise<void>;
  getById: (id: string) => Promise<Service | null>;
  upsert: (data: Partial<Service>) => Promise<Service>;
  remove: (id: string) => Promise<void>;
};

export const useServicesStore = create<ServicesState>((set, get) => ({
  services: [],
  loading: false,

  // --------------------
  // INIT — load all services
  // --------------------
  init: async () => {
    set({ loading: true });
    try {
      const q = query(servicesCol, orderBy("name"));
      const snap = await getDocs(q);

      const list: Service[] = [];
      snap.forEach((d) => {
        const data = d.data() as any;
        list.push({
          id: data.id,
          name: data.name,
          description: data.description ?? "",
          warning: data.warning ?? "",
          unitPrice: Number(data.unitPrice ?? 0),
          category: data.category ?? null,
          taxable: Boolean(data.taxable),
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });

      set({ services: list, loading: false });
    } catch (error) {
      console.error('Failed to load services:', error);
      set({ loading: false });
    }
  },

  // --------------------
  // GET BY ID
  // --------------------
  getById: async (id: string) => {
    try {
      const ref = doc(servicesCol, id);
      const snap = await getDoc(ref);
      return snap.exists() ? (snap.data() as Service) : null;
    } catch (error) {
      console.error('Failed to get service:', error);
      return null;
    }
  },

  // --------------------
  // UPSERT (create or update)
  // --------------------
  upsert: async (data: Partial<Service>) => {
    try {
      const now = Date.now();

      // If no ID → create new
      const id =
        data.id ??
        (typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2));

      const ref = doc(servicesCol, id);

      const payload: Service = {
        id,
        name: data.name ?? "Unnamed Service",
        description: data.description ?? "",
        warning: data.warning ?? "",
        unitPrice: Number(data.unitPrice ?? 0),
        category: data.category ?? null,
        taxable: data.taxable ?? false,
        createdAt: data.createdAt ?? now,
        updatedAt: now,
      };

      await setDoc(ref, payload, { merge: true });

      // Update store list
      const list = get().services.filter((s) => s.id !== id);
      set({ services: [...list, payload] });

      return payload;
    } catch (error) {
      console.error('Failed to save service:', error);
      throw new Error('Failed to save service. Please try again.');
    }
  },

  // --------------------
  // REMOVE
  // --------------------
  remove: async (id: string) => {
    try {
      await deleteDoc(doc(servicesCol, id));
      set({ services: get().services.filter((s) => s.id !== id) });
    } catch (error) {
      console.error('Failed to delete service:', error);
      throw new Error('Failed to delete service. Please try again.');
    }
  },
}));