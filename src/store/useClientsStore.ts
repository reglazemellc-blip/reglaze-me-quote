// -------------------------------------------------------------
// useClientsStore.ts  (FULLY UPGRADED FOR CITY/STATE/ZIP)
// -------------------------------------------------------------

import { create } from "zustand";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import type {
  Client,
  Attachment,
  ConversationEntry,
  Reminder,
} from "@db/index";

type ClientsState = {
  clients: Client[];
  loading: boolean;
  init: () => Promise<void>;
  upsert: (c: Partial<Client>) => Promise<Client>;
  remove: (id: string) => Promise<void>;
  search: (term: string) => Client[];
};

const clientsCol = collection(db, "clients");
const quotesCol = collection(db, "quotes");

export const useClientsStore = create<ClientsState>((set, get) => ({
  clients: [],
  loading: true,

  // -------------------------------------------------
  // LOAD ALL CLIENTS
  // -------------------------------------------------
  init: async () => {
    const snap = await getDocs(clientsCol);

    const clients: Client[] = snap.docs.map((d) => ({
      ...(d.data() as Client),
      id: d.id,

      // SAFE FALLBACKS
      photos: d.data().photos ?? [],
      attachments: d.data().attachments ?? [],
      conversations: d.data().conversations ?? [],
      reminders: d.data().reminders ?? [],

      // NEW FIELDS WITH GUARANTEED SAFETY
      city: d.data().city ?? "",
      state: d.data().state ?? "",
      zip: d.data().zip ?? "",
    }));

    set({ clients, loading: false });
  },

  // -------------------------------------------------
  // CREATE / UPDATE CLIENT
  // -------------------------------------------------
  upsert: async (c) => {
    const now = Date.now();

    const clean: Client = {
      id: c.id!,
      name: c.name ?? "",
      phone: c.phone ?? "",
      email: c.email ?? "",
      address: c.address ?? "",
      notes: c.notes ?? "",

      // ADDED LOCATION FIELDS
      city: c.city ?? "",
      state: c.state ?? "",
      zip: c.zip ?? "",

      photos: c.photos ?? [],
      attachments: c.attachments ?? [],
      conversations: c.conversations ?? [],
      reminders: c.reminders ?? [],

      createdAt: c.createdAt ?? now,
      updatedAt: now,
    };

    await setDoc(doc(clientsCol, clean.id), clean);

    // reload clients
    const snap = await getDocs(clientsCol);
    const clients: Client[] = snap.docs.map((d) => ({
      ...(d.data() as Client),
      id: d.id,
      photos: d.data().photos ?? [],
      attachments: d.data().attachments ?? [],
      conversations: d.data().conversations ?? [],
      reminders: d.data().reminders ?? [],

      // ensure new fields exist on reload
      city: d.data().city ?? "",
      state: d.data().state ?? "",
      zip: d.data().zip ?? "",
    }));

    set({ clients });

    return clean;
  },

  // -------------------------------------------------
  // REMOVE CLIENT + THEIR QUOTES
  // -------------------------------------------------
  remove: async (id) => {
    await deleteDoc(doc(clientsCol, id));

    // delete quotes belonging to client
    const qSnap = await getDocs(
      query(quotesCol, where("clientId", "==", id))
    );
    const deletes = qSnap.docs.map((d) =>
      deleteDoc(doc(quotesCol, d.id))
    );
    await Promise.all(deletes);

    // reload
    const snap = await getDocs(clientsCol);
    const clients: Client[] = snap.docs.map((d) => ({
      ...(d.data() as Client),
      id: d.id,
      photos: d.data().photos ?? [],
      attachments: d.data().attachments ?? [],
      conversations: d.data().conversations ?? [],
      reminders: d.data().reminders ?? [],
      city: d.data().city ?? "",
      state: d.data().state ?? "",
      zip: d.data().zip ?? "",
    }));

    set({ clients });
  },

  // -------------------------------------------------
  // SEARCH CLIENTS
  // -------------------------------------------------
  search: (term) => {
    const q = term.toLowerCase();

    return get().clients.filter((c) =>
      [
        c.name,
        c.phone,
        c.email,
        c.address,
        c.city,
        c.state,
        c.zip,
      ]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q))
    );
  },
}));
