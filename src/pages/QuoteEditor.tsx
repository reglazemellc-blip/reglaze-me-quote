// -------------------------------------------------------------
// QuoteEditor.tsx  (UPGRADED FOR NEW QUOTE TYPE)
// -------------------------------------------------------------

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  DocumentData,
} from "firebase/firestore";
import { db as firestoreDb } from "../firebase";
import {
  Quote,
  LineItem,
  QuoteStatus,
  getOrInitSettings,
} from "@db/index";

type QuoteEditorProps = {
  mode: "create" | "edit";
};

function createEmptyItem(): LineItem {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  return {
    id,
    description: "",
    qty: 1,
    unitPrice: 0,
    total: 0,
  };
}

function calculateTotals(items: LineItem[], taxRate: number, discount: number) {
  const subtotal = items.reduce((sum, it) => sum + (it.total || 0), 0);
  const tax = subtotal * taxRate;
  const total = subtotal + tax - discount;
  return { subtotal, tax, total };
}

export default function QuoteEditor({ mode }: QuoteEditorProps) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();

  const isEdit = mode === "edit";
  const quoteId = isEdit ? id ?? "" : "";

  // ---------- State ----------

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");

  const [items, setItems] = useState<LineItem[]>([createEmptyItem()]);

  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<QuoteStatus>("pending");
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(0);

  // NEW FIELDS
  const [attachments, setAttachments] = useState<any[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);

  // ---------- Load existing quote or defaults ----------

  useEffect(() => {
    const run = async () => {
      try {
        if (isEdit && quoteId) {
          const ref = doc(firestoreDb, "quotes", quoteId);
          const snap = await getDoc(ref);

          if (!snap.exists()) {
            alert("Quote not found.");
            navigate("/quotes");
            return;
          }

          const data = snap.data() as DocumentData;

          setClientId(String(data.clientId ?? ""));
          setClientName(String(data.clientName ?? ""));

          const loadedItems: LineItem[] = Array.isArray(data.items)
            ? data.items.map((it: any) => ({
                id: String(it.id ?? ""),
                description: String(it.description ?? ""),
                qty: Number(it.qty ?? 0),
                unitPrice: Number(it.unitPrice ?? 0),
                total: Number(it.total ?? 0),
                warning: it.warning ? String(it.warning) : undefined,
              }))
            : [createEmptyItem()];

          setItems(loadedItems);
          setNotes(String(data.notes ?? ""));
          setStatus((data.status as QuoteStatus) || "pending");
          setDiscount(Number(data.discount ?? 0));
          setTaxRate(Number(data.taxRate ?? 0));

          // NEW FIELDS
          setAttachments(data.attachments ?? []);
          setPdfUrl(data.pdfUrl ?? null);
          setSentAt(data.sentAt ?? null);
          setExpiresAt(data.expiresAt ?? null);
        } else {
          const clientFromUrl = searchParams.get("clientId") ?? "";
          setClientId(clientFromUrl);

          const settings = await getOrInitSettings();
          setTaxRate(settings.defaultTaxRate ?? 0);
        }
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [isEdit, quoteId, navigate, searchParams]);

  // ---------- Totals ----------

  const totals = useMemo(
    () => calculateTotals(items, taxRate, discount),
    [items, taxRate, discount]
  );

  // ---------- Handlers ----------

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

  const handleSave = async () => {
    if (!clientName.trim()) {
      alert("Please enter a client name.");
      return;
    }

    setSaving(true);
    try {
      const now = Date.now();

      const payload: Partial<Quote> = {
        id: quoteId || "",
        clientId,
        clientName: clientName.trim(),
        items,
        services: [],
        subtotal: totals.subtotal,
        taxRate,
        tax: totals.tax,
        discount,
        total: totals.total,
        notes,
        status,
        signature: null,

        // NEW FIELDS – preserve values
        attachments,
        pdfUrl,
        sentAt,
        expiresAt,

        createdAt: isEdit ? undefined : now,
        updatedAt: now,
      };

      const colRef = collection(firestoreDb, "quotes");

      if (isEdit && quoteId) {
        const ref = doc(colRef, quoteId);
        await setDoc(ref, { ...payload, id: quoteId }, { merge: true });
        alert("Quote updated.");
      } else {
        const newRef = doc(colRef);
        const finalPayload = { ...payload, id: newRef.id, createdAt: now };
        await setDoc(newRef, finalPayload);
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

  // ---------- Render ----------

  if (loading)
    return <div className="p-6 text-center text-gray-400">Loading quote…</div>;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto flex flex-col gap-4">
      <h1 className="text-2xl font-semibold text-[#e8d487] mb-2">
        {isEdit ? "Edit Quote" : "New Quote"}
      </h1>

      {/* CLIENT INFO */}
      <div className="card p-4 space-y-3">
        <h2 className="text-lg font-semibold border-l-2 border-[#e8d487] pl-2 text-[#f5f3da]">
          Client
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">
              Client Name
            </label>
            <input
              className="input w-full"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">
              Client ID
            </label>
            <input
              className="input w-full"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* LINE ITEMS */}
      <div className="card p-4 space-y-3">
        <div className="flex justify-between items-center mb-1">
          <h2 className="text-lg font-semibold border-l-2 border-[#e8d487] pl-2 text-[#f5f3da]">
            Line Items
          </h2>
          <button className="btn-outline-gold text-sm" onClick={addItem}>
            + Add Item
          </button>
        </div>

        <div className="space-y-3">
          {items.map((it) => (
            <div
              key={it.id}
              className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] gap-2 items-center bg-black/40 rounded-lg p-3"
            >
              <input
                className="input"
                placeholder="Description"
                value={it.description}
                onChange={(e) =>
                  updateItem(it.id, { description: e.target.value })
                }
              />
              <input
                className="input"
                type="number"
                value={it.qty}
                onChange={(e) =>
                  updateItem(it.id, { qty: Number(e.target.value) })
                }
              />
              <input
                className="input"
                type="number"
                step="0.01"
                value={it.unitPrice}
                onChange={(e) =>
                  updateItem(it.id, {
                    unitPrice: Number(e.target.value),
                  })
                }
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-[#f5f3da]">
                  ${it.total.toFixed(2)}
                </span>
                <button
                  className="text-red-500 text-xs"
                  onClick={() => removeItem(it.id)}
                >
                  Remove
                </button>
              </div>

              <textarea
                className="input md:col-span-4 h-16"
                placeholder="Optional warning"
                value={it.warning ?? ""}
                onChange={(e) =>
                  updateItem(it.id, { warning: e.target.value })
                }
              />
            </div>
          ))}
        </div>
      </div>

      {/* NOTES + TOTALS */}
      <div className="card p-4 grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4">
        <div>
          <h2 className="text-lg font-semibold border-l-2 border-[#e8d487] pl-2 text-[#f5f3da]">
            Notes
          </h2>
          <textarea
            className="input h-32"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div>
          <h2 className="text-lg font-semibold border-l-2 border-[#e8d487] pl-2 text-[#f5f3da]">
            Totals
          </h2>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Subtotal</span>
              <span className="text-[#f5f3da]">
                ${totals.subtotal.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between items-center gap-2">
              <span className="text-gray-400">Tax Rate</span>
              <input
                className="input w-24 text-right"
                type="number"
                step="0.001"
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
              />
            </div>

            <div className="flex justify-between">
              <span className="text-gray-400">Tax</span>
              <span className="text-[#f5f3da]">
                ${totals.tax.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between items-center gap-2">
              <span className="text-gray-400">Discount</span>
              <input
                className="input w-24 text-right"
                type="number"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
              />
            </div>

            <div className="flex justify-between border-t border-[#2a2a2a] pt-2 mt-2">
              <span className="font-semibold text-[#e8d487]">Total</span>
              <span className="font-bold text-[#f5f3da]">
                ${totals.total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* FUTURE FIELDS (READ-ONLY FOR NOW) */}
      <div className="card p-4 space-y-3">
        <h2 className="text-lg font-semibold text-[#f5f3da]">
          Additional Info
        </h2>

        <div className="text-sm text-gray-400 space-y-1">
          <div>Attachments: {attachments.length}</div>
          <div>PDF: {pdfUrl ? "Attached" : "None"}</div>
          <div>
            Sent:
            {sentAt ? ` ${new Date(sentAt).toLocaleString()}` : " Not sent"}
          </div>
          <div>
            Expires:
            {expiresAt
              ? ` ${new Date(expiresAt).toLocaleDateString()}`
              : " None"}
          </div>
        </div>
      </div>

      {/* SAVE */}
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
  );
}
