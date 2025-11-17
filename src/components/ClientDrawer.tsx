// -------------------------------------------------------------
// ClientDrawer.tsx — slide-out to create a new client
// Supports: name, phone, email, street/city/state/zip
// -------------------------------------------------------------

import React, { useState, useEffect } from "react";
import { collection, doc, setDoc } from "firebase/firestore";
import { db as firestoreDb } from "../firebase";
import { Client } from "@db/index";

type Props = {
  open: boolean;
  initialName?: string;
  initialPhone?: string;
  initialEmail?: string;
  initialStreet?: string;
  initialCity?: string;
  initialState?: string;
  initialZip?: string;
  onClose: () => void;
  onCreated: (client: Client) => void;
};

function buildAddressString(
  street: string,
  city: string,
  state: string,
  zip: string
): string {
  const s = street.trim();
  const c = city.trim();
  const st = state.trim();
  const z = zip.trim();

  let line1 = s;
  let line2 = "";

  if (c || st || z) {
    const parts: string[] = [];
    if (c) parts.push(c);
    if (st) parts.push(st);
    const left = parts.join(", ");
    line2 = left + (z ? (left ? " " + z : z) : "");
  }

  if (line1 && line2) return `${line1}\n${line2}`;
  if (!line1 && line2) return line2;
  if (line1 && !line2) return line1;
  return "";
}

export default function ClientDrawer({
  open,
  initialName,
  initialPhone,
  initialEmail,
  initialStreet,
  initialCity,
  initialState,
  initialZip,
  onClose,
  onCreated,
}: Props) {
  const [name, setName] = useState(initialName ?? "");
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [email, setEmail] = useState(initialEmail ?? "");
  const [street, setStreet] = useState(initialStreet ?? "");
  const [city, setCity] = useState(initialCity ?? "");
  const [state, setState] = useState(initialState ?? "");
  const [zip, setZip] = useState(initialZip ?? "");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setName(initialName ?? "");
      setPhone(initialPhone ?? "");
      setEmail(initialEmail ?? "");
      setStreet(initialStreet ?? "");
      setCity(initialCity ?? "");
      setState(initialState ?? "");
      setZip(initialZip ?? "");
      setNotes("");
    }
  }, [
    open,
    initialName,
    initialPhone,
    initialEmail,
    initialStreet,
    initialCity,
    initialState,
    initialZip,
  ]);

  if (!open) return null;

  const handleCreate = async () => {
    if (!name.trim()) {
      alert("Client name is required.");
      return;
    }

    const now = Date.now();
    const clientsCol = collection(firestoreDb, "clients");
    const newRef = doc(clientsCol);

    const address = buildAddressString(street, city, state, zip);

    const client: Client = {
      id: newRef.id,
      name: name.trim(),
      phone: phone || undefined,
      email: email || undefined,
      address: address || undefined,
      notes: notes || "",
      photos: [],
      attachments: [],
      conversations: [],
      reminders: [],
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(newRef, client);
    onCreated(client);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[10000] flex justify-end bg-black/40">
      <div className="w-full max-w-md h-full bg-[#111] border-l border-[#2a2a2a] p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#e8d487]">
            New Client
          </h2>
          <button
            className="text-gray-400 hover:text-gray-200 text-sm"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-auto space-y-3">
          {/* Name */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Name</label>
            <input
              className="input w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Client name"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Phone</label>
            <input
              className="input w-full"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone"
            />
          </div>

          {/* Email */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Email</label>
            <input
              className="input w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
            />
          </div>

          {/* Address */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">
              Street Address
            </label>
            <input
              className="input w-full"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              placeholder="123 Main St"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">
                City
              </label>
              <input
                className="input w-full"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">
                State
              </label>
              <input
                className="input w-full"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">
              ZIP Code
            </label>
            <input
              className="input w-full"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">
              Notes
            </label>
            <textarea
              className="input w-full h-20"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any extra info about this client…"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-[#2a2a2a]">
          <button
            className="btn-outline-gold px-4"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="btn-gold px-6"
            onClick={handleCreate}
          >
            Save Client
          </button>
        </div>
      </div>
    </div>
  );
}
