// -------------------------------------------------------------
// QuoteEditor.tsx
// - Client autocomplete
// - Street / City / State / ZIP (stored as multiline address string)
// - Service dropdown on click
// - Service Description textarea
// - Warning textarea
// - Saves BOTH clientId + client snapshot on the quote
// - Strongly typed attachments + photo upload
// -------------------------------------------------------------

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  DocumentData,
} from "firebase/firestore";

import { db as firestoreDb } from "../firebase";

import { useServicesStore } from "@store/useServicesStore";
import { useClientsStore } from "@store/useClientsStore";
import { useConfigStore } from "@store/useConfigStore";

import {
  Quote,
  LineItem,
  QuoteStatus,
  getOrInitSettings,
  Client,
  QuoteClientSnapshot,
  Attachment,
  AttachmentType,
} from "@db/index";

import ClientDrawer from "@components/ClientDrawer";
import PhotoUpload from "@components/PhotoUpload";
import ClientAutocomplete from "@components/ClientAutocomplete";


// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------
function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

// Generate next quote number from settings
async function generateQuoteNumber(): Promise<string> {
  const settingsRef = doc(firestoreDb, "settings", "settings");
  const snap = await getDoc(settingsRef);
  
  let nextSeq = 1;
  if (snap.exists()) {
    const data = snap.data();
    nextSeq = (data.nextSequence || 1);
  }
  
  // Update the sequence for next time
  await setDoc(settingsRef, { nextSequence: nextSeq + 1 }, { merge: true });
  
  // Return formatted quote number: Q-0001
  return `Q-${String(nextSeq).padStart(4, '0')}`;
}

function createEmptyItem(): LineItem {
  return {
    id: createId(),
    description: "",
    serviceDescription: "",
    qty: 1,
    unitPrice: 0,
    total: 0,
    warning: "",
  };
}

function calcTotals(items: LineItem[], taxRate: number, discount: number) {
  const subtotal = items.reduce((sum, it) => sum + (it.total || 0), 0);
  const tax = subtotal * taxRate;
  const total = subtotal + tax - discount;
  return { subtotal, tax, total };
}

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

// Flat service type used by dropdown
type FlatService = {
  id: string;
  name: string;
  description?: string;
  warning?: string;
  unitPrice?: number;
};

// -------------------------------------------------------------
// MAIN COMPONENT
// -------------------------------------------------------------
export default function QuoteEditor({ mode = "edit" }: { mode?: "create" | "edit" }) {

  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();

  const isEdit = mode === "edit";
  const quoteIdParam = isEdit ? id ?? "" : "";

  // For NEW quotes, we pre-generate a stable ID so uploads can use it
  const draftIdRef = useRef<string | null>(null);
  if (!isEdit && !draftIdRef.current) {
    draftIdRef.current = createId();
  }
  const effectiveQuoteId = isEdit ? quoteIdParam : draftIdRef.current!;

  // Stores
  const { services, init: initServices } = useServicesStore();
  const { clients, init: initClients } = useClientsStore();
  const { config } = useConfigStore();

  const labels = config?.labels;

  // Client state
  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");

  const [clientStreet, setClientStreet] = useState("");
  const [clientCity, setClientCity] = useState("");
  const [clientState, setClientState] = useState("");
  const [clientZip, setClientZip] = useState("");

 
  const [clientDrawerOpen, setClientDrawerOpen] = useState(false);

  // Quote state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [items, setItems] = useState<LineItem[]>([createEmptyItem()]);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<QuoteStatus>("pending");

  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(0);

  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);

  // NEW: quote number badge support
  const [quoteNumber, setQuoteNumber] = useState<string | null>(null);

  // Due date support
  const [dueTerms, setDueTerms] = useState<string>("due_upon_completion");

  // Service dropdown control
  const [openServiceFor, setOpenServiceFor] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // -------------------------------------------------------------
  // Init clients + services
  // -------------------------------------------------------------
  useEffect(() => {
    initClients();
    initServices();
  }, [initClients, initServices]);

  // -------------------------------------------------------------
  // Click-outside close for service dropdowns + client menu
  // -------------------------------------------------------------
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) {
        setOpenServiceFor(null);
       
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // -------------------------------------------------------------
  // Load quote OR defaults
  // -------------------------------------------------------------
  useEffect(() => {
    const run = async () => {
      try {
        if (isEdit && quoteIdParam) {
          const ref = doc(firestoreDb, "quotes", quoteIdParam);
          const snap = await getDoc(ref);

          if (!snap.exists()) {
            alert("Quote not found.");
            navigate("/quotes");
            return;
          }

          const data = snap.data() as DocumentData;

          // quoteNumber support
          setQuoteNumber(
            (data.quoteNumber as string | undefined | null) ?? null
          );

          const snapshot = (data.client || {}) as Partial<QuoteClientSnapshot>;

          const loadedClientId =
            (data.clientId as string | undefined) ??
            (snapshot.id as string | undefined) ??
            "";

          const loadedName =
            (data.clientName as string | undefined) ??
            (snapshot.name as string | undefined) ??
            "";

          const loadedPhone =
            (data.clientPhone as string | undefined) ??
            (snapshot.phone as string | undefined) ??
            "";

          const loadedEmail =
            (data.clientEmail as string | undefined) ??
            (snapshot.email as string | undefined) ??
            "";

          const loadedAddress =
            (data.clientAddress as string | undefined) ??
            (snapshot.address as string | undefined) ??
            "";

          setClientId(loadedClientId);
          setClientName(loadedName);
          setClientPhone(loadedPhone ?? "");
          setClientEmail(loadedEmail ?? "");

          const parsedAddr = parseAddressString(loadedAddress);
          setClientStreet(parsedAddr.street);
          setClientCity(parsedAddr.city);
          setClientState(parsedAddr.state);
          setClientZip(parsedAddr.zip);

          const loadedItems: LineItem[] = Array.isArray(data.items)
            ? data.items.map((it: any) => ({
                id: String(it.id ?? ""),
                description: String(it.description ?? ""),
                serviceDescription: it.serviceDescription
                  ? String(it.serviceDescription)
                  : "",
                qty: Number(it.qty ?? 0),
                unitPrice: Number(it.unitPrice ?? 0),
                total: Number(it.total ?? 0),
                warning: it.warning ? String(it.warning) : "",
              }))
            : [createEmptyItem()];

          setItems(loadedItems);
          setNotes(String(data.notes ?? ""));
          setStatus((data.status as QuoteStatus) || "pending");

          setDiscount(Number(data.discount ?? 0));
          setTaxRate(Number(data.taxRate ?? 0));

          setAppointmentDate(String(data.appointmentDate ?? ""));
          setAppointmentTime(String(data.appointmentTime ?? ""));

          // Load due terms
          setDueTerms(String(data.dueTerms ?? "due_upon_completion"));

          // normalize existing attachments to typed Attachment[]
          const rawAtt = Array.isArray(data.attachments)
            ? data.attachments
            : [];
          const normalized: Attachment[] = rawAtt.map((a: any) => ({
            id: String(a.id ?? createId()),
            name: String(a.name ?? "Attachment"),
            url: String(a.url ?? ""),
            type: (a.type as AttachmentType) || "photo",
            createdAt: Number(a.createdAt ?? Date.now()),
            path: String(a.path ?? ""),
            conversationId: a.conversationId ?? undefined,
          }));
          setAttachments(normalized);

          setPdfUrl(data.pdfUrl ?? null);
          setSentAt(data.sentAt ?? null);
          setExpiresAt(data.expiresAt ?? null);
        } else {
          const clientFromUrl = searchParams.get("clientId") ?? "";
          setClientId(clientFromUrl);
          setQuoteNumber(null);

          const settings = await getOrInitSettings();
          setTaxRate(settings.defaultTaxRate ?? 0);

          // Autofill if coming from ClientDetail
          if (clientFromUrl) {
            const found = clients.find((c) => c.id === clientFromUrl);
            if (found) {
              setClientName(found.name);
              setClientPhone(found.phone ?? "");
              setClientEmail(found.email ?? "");

              const parsed = parseAddressString(
                (found.address as string | undefined) ?? ""
              );
              setClientStreet(parsed.street);
              setClientCity(parsed.city);
              setClientState(parsed.state);
              setClientZip(parsed.zip);
            }
          }
        }
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [isEdit, quoteIdParam, navigate, searchParams, clients]);

  // -------------------------------------------------------------
  // Client filtering for autocomplete
  // -------------------------------------------------------------
  

  // -------------------------------------------------------------
  // Flatten services for dropdown
  // -------------------------------------------------------------
  const flatServices: FlatService[] = useMemo(() => {
    const list: FlatService[] = [];

    const pushService = (s: any) => {
      if (!s) return;
      const fullName = String(s.name ?? "").trim();
      if (!fullName) return;

      const unitPrice =
        typeof s.unitPrice === "number"
          ? s.unitPrice
          : typeof s.price === "number"
          ? s.price
          : undefined;

      list.push({
        id: s.id || fullName,
        name: fullName,
        description: s.description ?? "",
        warning: s.warning ?? "",
        unitPrice,
      });
    };

    (services as any[]).forEach((group: any) => {
      if (Array.isArray(group?.subservices)) {
        group.subservices.forEach((s: any) => pushService(s));
      } else if (Array.isArray(group?.services)) {
        group.services.forEach((s: any) => pushService(s));
      } else if (group?.name) {
        pushService(group);
      }
    });

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [services]);

  // -------------------------------------------------------------
  // Line item handlers
  // -------------------------------------------------------------
  const updateItem = (id: string, patch: Partial<LineItem>) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const next: LineItem = { ...it, ...patch };
        next.total = Number(next.qty || 0) * Number(next.unitPrice || 0);
        return next;
      })
    );
  };

  const addItem = () => setItems((prev) => [...prev, createEmptyItem()]);
  const removeItem = (id: string) =>
    setItems((prev) => {
      const next = prev.filter((it) => it.id !== id);
      return next.length ? next : [createEmptyItem()];
    });

  const totals = useMemo(
    () => calcTotals(items, taxRate, discount),
    [items, taxRate, discount]
  );

  // -------------------------------------------------------------
  // Save CLIENT (button in header)
  // -------------------------------------------------------------
  const handleSaveClient = async () => {
    if (!clientName.trim()) {
      alert("Client name is required.");
      return;
    }

    const now = Date.now();
    const addressString = buildAddressString(
      clientStreet,
      clientCity,
      clientState,
      clientZip
    );

    let finalId = clientId;
    const clientsCol = collection(firestoreDb, "clients");

    if (!finalId) {
      const newRef = doc(clientsCol);
      finalId = newRef.id;

      const newClient: Client = {
        id: finalId,
        name: clientName.trim(),
        phone: clientPhone || undefined,
        email: clientEmail || undefined,
        address: addressString || undefined,
        notes: "",
        photos: [],
        attachments: [],
        conversations: [],
        reminders: [],
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(newRef, newClient);
    } else {
      const ref = doc(clientsCol, finalId);
      await setDoc(
        ref,
        {
          name: clientName.trim(),
          phone: clientPhone || undefined,
          email: clientEmail || undefined,
          address: addressString || undefined,
          updatedAt: now,
        },
        { merge: true }
      );
    }

    setClientId(finalId);
    await initClients();
    alert("Client saved.");
  };

  // -------------------------------------------------------------
  // Save quote (auto-create client if needed)
  // -------------------------------------------------------------
  const handleSave = async () => {
    if (!clientName.trim()) {
      alert("Please enter a client name.");
      return;
    }

    setSaving(true);

    try {
      const now = Date.now();
      let finalClientId = clientId;

      const addressString = buildAddressString(
        clientStreet,
        clientCity,
        clientState,
        clientZip
      );

      // Auto-create client if no id
      if (!finalClientId) {
        const clientsCol = collection(firestoreDb, "clients");
        const newRef = doc(clientsCol);
        finalClientId = newRef.id;

        const newClient: Client = {
          id: finalClientId,
          name: clientName.trim(),
          phone: clientPhone || undefined,
          email: clientEmail || undefined,
          address: addressString || undefined,
          notes: "",
          photos: [],
          attachments: [],
          conversations: [],
          reminders: [],
          createdAt: now,
          updatedAt: now,
        };

        await setDoc(newRef, newClient);
        await initClients();
      }

      const safeDate =
        status === "scheduled" ? appointmentDate || null : null;
      const safeTime =
        status === "scheduled" ? appointmentTime || null : null;

      // Calculate due date based on terms
      let dueDate: number | undefined;
      if (dueTerms === "due_upon_completion") {
        dueDate = undefined; // Will be determined at completion
      } else if (dueTerms === "net_15") {
        dueDate = now + (15 * 24 * 60 * 60 * 1000);
      } else if (dueTerms === "net_30") {
        dueDate = now + (30 * 24 * 60 * 60 * 1000);
      } else if (dueTerms === "net_60") {
        dueDate = now + (60 * 24 * 60 * 60 * 1000);
      }

      const clientSnapshot: QuoteClientSnapshot = {
        id: finalClientId,
        name: clientName.trim(),
        phone: clientPhone || undefined,
        email: clientEmail || undefined,
        address: addressString || undefined,
      };

      // Generate quote number for new quotes if not already set
      let finalQuoteNumber = quoteNumber;
      if (!isEdit && !finalQuoteNumber) {
        finalQuoteNumber = await generateQuoteNumber();
      }

      const payload: Partial<Quote> = {
        // id will be set when writing
        clientId: finalClientId,
        clientName: clientName.trim(),
        clientPhone,
        clientEmail,
        clientAddress: addressString || undefined,
        client: clientSnapshot,

        items: items.map((it) => ({
          ...it,
          serviceDescription: it.serviceDescription ?? "",
        })),
        services: [],
        subtotal: totals.subtotal,
        taxRate,
        tax: totals.tax,
        discount,
        total: totals.total,
        notes,
        status,
        signature: null,
        appointmentDate: safeDate,
        appointmentTime: safeTime,
        quoteNumber: finalQuoteNumber || undefined,
        dueTerms,
        dueDate,
        attachments,
        pdfUrl,
        sentAt,
        expiresAt,
        createdAt: now,
        updatedAt: now,
      };

      const quotesCol = collection(firestoreDb, "quotes");

      if (isEdit && quoteIdParam) {
        const ref = doc(quotesCol, quoteIdParam);
        // Remove undefined values before saving
        const cleanPayload = JSON.parse(JSON.stringify({ ...payload, id: quoteIdParam }));
        await setDoc(ref, cleanPayload, { merge: true });
        alert("Quote updated.");
      } else {
        const newRef = doc(quotesCol, effectiveQuoteId);
        // Remove undefined values before saving
        const cleanPayload = JSON.parse(JSON.stringify({
          ...payload,
          id: effectiveQuoteId,
          createdAt: now,
        }));
        await setDoc(newRef, cleanPayload);
        alert("Quote created.");
      }

      navigate("/quotes");
    } catch (err) {
      console.error(err);
      alert("Failed to save quote.");
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------------------
  // Render
  // -------------------------------------------------------------
  if (loading)
    return (
      <div className="p-6 text-center text-gray-400">Loading quote…</div>
    );

  const isNew = !isEdit;

  return (
    <>
      <div
        ref={wrapperRef}
        className="p-4 md:p-6 max-w-4xl mx-auto flex flex-col gap-6 text-[#f5f3da]"
      >
        {/* HEADER */}
        <h1 className="text-2xl font-semibold text-[#e8d487] flex items-center gap-3">
          <span>{isEdit ? (labels?.quoteIdLabel ? `Edit ${labels.quoteIdLabel}` : 'Edit Quote') : (labels?.quoteNewButton || 'New Quote')}</span>
          {quoteNumber && (
            <span className="text-xs px-2 py-1 rounded-full border border-[#e8d487]/60 text-[#e8d487]">
              {quoteNumber}
            </span>
          )}
        </h1>

        {/* CLIENT SECTION */}
        <div className="card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold pl-2">

              {labels?.quoteClientLabel || 'Client'}
            </h2>

            <div className="flex gap-2">
              <button
                type="button"
                className="btn-outline-gold text-xs px-3 py-1"
                onClick={handleSaveClient}
              >
                {labels?.clientSaveButton || 'Save Client'}
              </button>

              <button
                type="button"
                className="btn-outline-gold text-xs px-3 py-1"
                onClick={() => setClientDrawerOpen(true)}
              >
                + {labels?.clientNewButton || 'New Client'}
              </button>
            </div>
          </div>

       {/* Client Autocomplete */}
<ClientAutocomplete
  value={
    clientId
      ? clients.find((c) => c.id === clientId) ?? null
      : null
  }
  onChange={(c) => {
    if (!c) {
      setClientId("");
      setClientName("");
      setClientPhone("");
      setClientEmail("");
      setClientStreet("");
      setClientCity("");
      setClientState("");
      setClientZip("");
      return;
    }

    setClientId(c.id);
    setClientName(c.name);
    setClientPhone(c.phone ?? "");
    setClientEmail(c.email ?? "");

    const parsed = parseAddressString(c.address ?? "");
    setClientStreet(parsed.street);
    setClientCity(parsed.city);
    setClientState(parsed.state);
    setClientZip(parsed.zip);
  }}
  label="Client"
  placeholder="Search clients by name, phone, email, address…"
  onAddNewViaDrawer={() => setClientDrawerOpen(true)}
/>


       

          {/* CONTACT DETAILS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Phone */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">Phone</label>
              <input
                className="input w-full"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
              />
            </div>

            {/* Email */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">Email</label>
              <input
                className="input w-full"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
              />
            </div>
          </div>

          {/* ADDRESS FIELDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Street */}
            <div className="md:col-span-2">
              <label className="text-xs text-gray-400 block mb-1">
                Street Address
              </label>
              <input
                className="input w-full"
                value={clientStreet}
                onChange={(e) => setClientStreet(e.target.value)}
              />
            </div>

            {/* City */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">City</label>
              <input
                className="input w-full"
                value={clientCity}
                onChange={(e) => setClientCity(e.target.value)}
              />
            </div>

            {/* State */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">State</label>
              <input
                className="input w-full"
                value={clientState}
                onChange={(e) => setClientState(e.target.value)}
              />
            </div>

            {/* ZIP */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">
                ZIP Code
              </label>
              <input
                className="input w-full"
                value={clientZip}
                onChange={(e) => setClientZip(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* STATUS + APPOINTMENT */}
        <div className="card p-4 space-y-3">
          <label className="text-xs text-gray-400 block mb-1">Status</label>
          <select
            className="input w-full"
            value={status}
            onChange={(e) => setStatus(e.target.value as QuoteStatus)}
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="canceled">Canceled</option>
          </select>

          {status === "scheduled" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  Appointment Date
                </label>
                <input
                  type="date"
                  className="input w-full"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  Appointment Time
                </label>
                <input
                  type="time"
                  className="input w-full"
                  value={appointmentTime}
                  onChange={(e) => setAppointmentTime(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Due Date Terms */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Payment Terms</label>
            <select
              className="input w-full"
              value={dueTerms}
              onChange={(e) => setDueTerms(e.target.value)}
            >
              <option value="due_upon_completion">Due Upon Completion</option>
              <option value="net_15">Net 15 Days</option>
              <option value="net_30">Net 30 Days</option>
              <option value="net_60">Net 60 Days</option>
            </select>
          </div>
        </div>

        {/* LINE ITEMS */}
        <div className="card p-4 space-y-4">
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-lg font-semibold border-l-2 border-[#e8d487] pl-2">
              {labels?.quoteItemsLabel || 'Line Items'}
            </h2>
            <button className="btn-outline-gold text-sm" onClick={addItem}>
              + {labels?.lineItemAddButton || 'Add Item'}
            </button>
          </div>

          <div className="space-y-4">
            {items.map((it) => {
              const filteredServices =
                it.description.trim() === ""
                  ? flatServices
                  : flatServices.filter((svc) => {
                      const q = it.description.toLowerCase();
                      return (
                        svc.name.toLowerCase().includes(q) ||
                        (svc.description ?? "")
                          .toLowerCase()
                          .includes(q)
                      );
                    });

              const handlePick = (svc: FlatService) => {
                updateItem(it.id, {
                  description: svc.name,
                  serviceDescription: svc.description ?? "",
                  unitPrice:
                    typeof svc.unitPrice === "number"
                      ? svc.unitPrice
                      : it.unitPrice,
                  warning: svc.warning ?? "",
                });
                setOpenServiceFor(null);
              };

              return (
                <div
                  key={it.id}
                  className="bg-black/40 rounded-lg p-4 space-y-3 border border-[#2a2a2a]"
                >
                  {/* Service input + dropdown */}
                  <div className="relative">
                    <label className="text-xs text-gray-400 block mb-1">
                      Service
                    </label>
                    <input
                      className="input w-full"
                      placeholder="Select or type service"
                      value={it.description}
                      onChange={(e) =>
                        updateItem(it.id, { description: e.target.value })
                      }
                      onFocus={() => setOpenServiceFor(it.id)}
                    />

                    {openServiceFor === it.id && (
                      <div
                        className="
                          absolute left-0 right-0 mt-1 max-h-60 overflow-auto 
                          bg-[#111] border border-[#2a2a2a] rounded-lg shadow-xl z-[9999]
                        "
                      >
                        {filteredServices.length > 0 ? (
                          filteredServices.map((svc) => (
                            <div
                              key={svc.id}
                              className="px-3 py-2 cursor-pointer hover:bg-black/40"
                              onClick={() => handlePick(svc)}
                            >
                              <div className="font-medium text-sm">
                                {svc.name}
                              </div>
                              {svc.description && (
                                <div className="text-xs text-gray-400">
                                  {svc.description}
                                </div>
                              )}
                              {svc.warning && (
                                <div className="text-[10px] text-yellow-400 mt-1">
                                  {svc.warning}
                                </div>
                              )}
                              {typeof svc.unitPrice === "number" && (
                                <div className="text-[10px] text-gray-400 mt-1">
                                  ${svc.unitPrice.toFixed(2)}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-xs text-gray-400">
                            No matching services
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Service Description */}
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">
                      Service Description
                    </label>
                    <textarea
                      className="input w-full h-20"
                      value={it.serviceDescription ?? ""}
                      placeholder="Describe the exact work being done…"
                      onChange={(e) =>
                        updateItem(it.id, {
                          serviceDescription: e.target.value,
                        })
                      }
                    />
                  </div>

                  {/* Warning */}
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">
                      Warning / Notes
                    </label>
                    <textarea
                      className="input w-full h-16"
                      value={it.warning ?? ""}
                      onChange={(e) =>
                        updateItem(it.id, { warning: e.target.value })
                      }
                    />
                  </div>

                  {/* Qty / Unit Price / Total */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">
                        Qty
                      </label>
                      <input
                        type="number"
                        className="input w-full"
                        value={it.qty}
                        onChange={(e) =>
                          updateItem(it.id, {
                            qty: Number(e.target.value),
                          })
                        }
                      />
                    </div>

                    <div>
                      <label className="text-xs text-gray-400 block mb-1">
                        Unit Price
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="input w-full"
                        value={it.unitPrice}
                        onChange={(e) =>
                          updateItem(it.id, {
                            unitPrice: Number(e.target.value),
                          })
                        }
                      />
                    </div>

                    <div className="flex flex-col justify-between">
                      <label className="text-xs text-gray-400 block mb-1">
                        Total
                      </label>
                      <div className="flex items-center justify-between">
                        <span className="text-[#f5f3da] text-sm">
                          ${it.total.toFixed(2)}
                        </span>
                        <button
                          className="text-red-500 text-xs"
                          onClick={() => removeItem(it.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* PHOTO UPLOAD */}
        <PhotoUpload
          attachments={attachments}
          setAttachments={setAttachments}
          quoteId={effectiveQuoteId}
        />

        {/* NOTES + TOTALS */}
        <div className="card p-4 grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4">
          <div>
            <h2 className="text-lg font-semibold border-l-2 border-[#e8d487] pl-2">
              {labels?.quoteNotesLabel || 'Notes'}
            </h2>
            <textarea
              className="input h-32"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div>
  <h2 className="text-lg font-semibold border-l-2 border-[#e8d487] pl-2">
    {labels?.quoteTotalLabel || 'Totals'}
  </h2>

  <div className="mt-3 space-y-3 bg-black/40 border border-[#2a2a2a] rounded-lg p-4 text-sm">

    {/* Subtotal */}
    <div className="flex justify-between text-[#f5f3da]">
      <span>Subtotal</span>
      <span>${totals.subtotal.toFixed(2)}</span>
    </div>

    {/* Tax Rate */}
    <div className="flex justify-between items-center">
      <span className="text-[#f5f3da]">Tax Rate</span>
      <input
        className="input w-24 text-right bg-black/60 border border-[#3a3a3a]"
        type="number"
        step="0.001"
        value={taxRate}
        onChange={(e) => setTaxRate(Number(e.target.value))}
      />
    </div>

    {/* Tax */}
    <div className="flex justify-between text-[#f5f3da]">
      <span>Tax</span>
      <span>${totals.tax.toFixed(2)}</span>
    </div>

    {/* Discount */}
    <div className="flex justify-between items-center">
      <span className="text-[#f5f3da]">Discount</span>
      <input
        className="input w-24 text-right bg-black/60 border border-[#3a3a3a]"
        type="number"
        step="0.01"
        value={discount}
        onChange={(e) => setDiscount(Number(e.target.value))}
      />
    </div>

    {/* TOTAL */}
    <div className="pt-3 mt-3 border-t border-[#3a3a3a]"></div>

    <div className="flex justify-between items-center text-[#e8d487] font-semibold text-xl">
      <span>Total</span>
      <span>${totals.total.toFixed(2)}</span>
    </div>
  </div>
</div>

        </div>

        {/* SAVE BAR */}
        <div className="sticky bottom-0 left-0 right-0 border-t border-[#2a2a2a] bg-[#050505]/95 backdrop-blur mt-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between px-4 py-3">
            <div className="text-xs text-gray-400">
              {isEdit ? "Editing quote" : "Creating quote"}
            </div>

            <div className="flex gap-2">
              <button
                className="btn-outline-gold px-4"
                onClick={() => navigate(-1)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="btn-gold px-6"
                onClick={handleSave}
                disabled={saving}
              >
                {saving
                  ? isEdit
                    ? "Saving..."
                    : "Creating..."
                  : isEdit
                  ? "Save Quote"
                  : "Create Quote"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CLIENT DRAWER */}
      <ClientDrawer
        open={clientDrawerOpen}
        initialName={clientName}
        initialPhone={clientPhone}
        initialEmail={clientEmail}
        initialStreet={clientStreet}
        initialCity={clientCity}
        initialState={clientState}
        initialZip={clientZip}
        onClose={() => setClientDrawerOpen(false)}
        onCreated={(client: Client) => {
          setClientId(client.id);
          setClientName(client.name);
          setClientPhone(client.phone ?? "");
          setClientEmail(client.email ?? "");

          const parsed = parseAddressString(
            (client.address as string | undefined) ?? ""
          );
          setClientStreet(parsed.street);
          setClientCity(parsed.city);
          setClientState(parsed.state);
          setClientZip(parsed.zip);
        }}
      />
    </>
  );
}
