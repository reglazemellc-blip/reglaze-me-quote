// -------------------------------------------------------------
// ClientDrawer.tsx — Unified Add / Edit Client Drawer
// Minimal fields + link to full profile
// -------------------------------------------------------------

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useClientsStore } from "@store/useClientsStore";
import type { Client } from "@db/index";
import { useToastStore } from "@store/useToastStore";


type Mode = "create" | "edit";

type Props = {
  open: boolean;

  // When editing an existing client
  mode?: Mode;
  client?: Client;

  // Backwards-compatible initial values for create (QuoteEditor, Clients, etc.)
  initialName?: string;
  initialPhone?: string;
  initialEmail?: string;
  initialStreet?: string;
  initialCity?: string;
  initialState?: string;
  initialZip?: string;

  onClose: () => void;

  // Optional hooks
  onCreated?: (client: Client) => void; // called after create
  onUpdated?: (client: Client) => void; // called after edit
};

// Combine 4 fields into a multiline address string:
// "Street\nCity, ST ZIP"
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

// Basic parser for old address strings → street + city/state/zip loose
function parseAddressString(addr: string | undefined | null) {
  if (!addr) {
    return { street: "", city: "", state: "", zip: "" };
  }
  const raw = String(addr);
  const [line1, line2] = raw.split("\n");
  const street = (line1 ?? "").trim();

  let city = "";
  let state = "";
  let zip = "";

  if (line2) {
    const trimmed = line2.trim();
    const [cityPart, rest] = trimmed.split(",");
    if (cityPart) city = cityPart.trim();

    if (rest) {
      const tokens = rest.trim().split(/\s+/);
      if (tokens.length >= 1) state = tokens[0];
      if (tokens.length >= 2) zip = tokens[1];
    }
  }

  return { street, city, state, zip };
}

export default function ClientDrawer({
  open,
  mode = "create",
  client,
  initialName,
  initialPhone,
  initialEmail,
  initialStreet,
  initialCity,
  initialState,
  initialZip,
  onClose,
  onCreated,
  onUpdated,
}: Props) {
  const { upsert } = useClientsStore();
  const navigate = useNavigate();

  const [name, setName] = useState(initialName ?? "");
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [email, setEmail] = useState(initialEmail ?? "");
  const [street, setStreet] = useState(initialStreet ?? "");
  const [city, setCity] = useState(initialCity ?? "");
  const [stateVal, setStateVal] = useState(initialState ?? "");
  const [zip, setZip] = useState(initialZip ?? "");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const cleaned = value.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX
    if (cleaned.length === 0) {
      return '';
    } else if (cleaned.length <= 3) {
      return `(${cleaned}`;
    } else if (cleaned.length <= 6) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    } else {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
  };

  // Reset form when drawer opens or when client/mode changes
  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && client) {
      setName(client.name ?? "");
      setPhone(formatPhoneNumber(client.phone ?? ""));
      setEmail(client.email ?? "");

      const parsed = parseAddressString(client.address ?? "");
      setStreet(parsed.street);
      setCity(parsed.city);
      setStateVal(parsed.state);
      setZip(parsed.zip);

      setNotes(client.notes ?? "");
    } else {
      // create mode: use initial props, clear notes
      setName(initialName ?? "");
      setPhone(formatPhoneNumber(initialPhone ?? ""));
      setEmail(initialEmail ?? "");
      setStreet(initialStreet ?? "");
      setCity(initialCity ?? "");
      setStateVal(initialState ?? "");
      setZip(initialZip ?? "");
      setNotes("");
    }

    setSaving(false);
  }, [
    open,
    mode,
    client,
    initialName,
    initialPhone,
    initialEmail,
    initialStreet,
    initialCity,
    initialState,
    initialZip,
  ]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleSave = useCallback(async () => {
    // Validation
    const errors: string[] = [];
    
    if (!name.trim()) {
      errors.push("Client name is required");
    }
    
    if (!phone.trim()) {
      errors.push("Phone number is required");
    } else {
      // Basic phone validation - must have at least 10 digits
      const digitsOnly = phone.replace(/\D/g, '');
      if (digitsOnly.length < 10) {
        errors.push("Phone number must have at least 10 digits");
      }
    }
    
    if (email.trim()) {
      // Email format validation if provided
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(email.trim())) {
        errors.push("Email format is invalid");
      }
    }

    if (errors.length > 0) {
      const errorMsg = errors.join('\n');
      useToastStore.getState().show(errorMsg, 4000);
      // Also show alert to ensure visibility
      alert('Please fix the following errors:\n\n' + errorMsg);
      return;
    }

    setSaving(true);
    try {
      const now = Date.now();
      const addressString = buildAddressString(
        street,
        city,
        stateVal,
        zip
      );

      if (mode === "edit" && client) {
        // preserve existing attachments, conversations, reminders, photos, createdAt
        const payload: Partial<Client> = {
          id: client.id,
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          address: addressString || undefined,
          notes: notes.trim() || "",
          status: client.status,
          photos: client.photos ?? [],
          attachments: client.attachments ?? [],
          conversations: client.conversations ?? [],
          reminders: client.reminders ?? [],
          createdAt: client.createdAt ?? now,
        };

        const saved = await upsert(payload);
        onUpdated?.(saved);
        onClose();
      } else {
        // create new client
        const id =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `client_${now}`;

        const payload: Partial<Client> = {
          id,
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          address: addressString || undefined,
          notes: notes.trim() || "",
          createdAt: now,
        };

        const saved = await upsert(payload);
        onCreated?.(saved);
        onClose();
      }
    } finally {
      setSaving(false);
    }
  }, [
    mode,
    client,
    name,
    phone,
    email,
    street,
    city,
    stateVal,
    zip,
    notes,
    upsert,
    onClose,
    onCreated,
    onUpdated,
  ]);

  if (!open) return null;

  const isEdit = mode === "edit" && !!client;

  return (
    <div className="fixed inset-0 z-[10000] flex justify-end bg-black/40">
      <div className="w-full max-w-md h-full bg-[#111] border-l border-[#2a2a2a] flex flex-col">
        {/* HEADER */}
        <div className="p-4 flex items-center justify-between border-b border-[#2a2a2a]">
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold text-[#e8d487]">
              {isEdit ? "Edit Client" : "New Client"}
            </h2>
            {isEdit && client?.id && (
              <button
                type="button"
                className="mt-1 text-[11px] text-gray-400 hover:text-[#e8d487] text-left"
                onClick={() => navigate(`/clients/${client.id}`)}
              >
                View full profile →
              </button>
            )}
          </div>

          <button
            className="text-gray-400 hover:text-gray-200 text-sm"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        {/* FORM */}
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {/* Name */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">
              Name *
            </label>
            <input
              className="input w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Client name"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">
              Phone
            </label>
            <input
              className="input w-full"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="(315) 555-5555"
              maxLength={14}
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
                value={stateVal}
                onChange={(e) => setStateVal(e.target.value)}
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

          {/* Email */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">
              Email
            </label>
            <input
              className="input w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
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

        {/* ACTIONS */}
        <div className="flex justify-end gap-2 pt-2 border-t border-[#2a2a2a] p-4">
          <button
            className="btn-outline-gold px-4"
            type="button"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="btn-gold px-6"
            type="button"
            onClick={handleSave}
            disabled={saving}
          >
            {saving
              ? isEdit
                ? "Saving…"
                : "Creating…"
              : isEdit
              ? "Save Client"
              : "Save Client"}
          </button>
        </div>
      </div>
    </div>
  );
}
