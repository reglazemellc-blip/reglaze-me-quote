// -------------------------------------------------------------
// InvoiceEditor.tsx — Create or edit an invoice
// -------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useInvoicesStore, formatInvoiceId } from "@store/useInvoicesStore";
import { useClientsStore } from "@store/useClientsStore";
import { useQuotesStore } from "@store/useQuotesStore";
import { useSettingsStore } from "@store/useSettingsStore";
import type { Invoice, LineItem } from "@db/index";
import ClientAutocomplete from "@components/ClientAutocomplete";

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
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

export default function InvoiceEditor({ mode }: { mode: "create" | "edit" }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const quoteIdFromUrl = searchParams.get("quoteId");

  const isEdit = mode === "edit";

  const { invoices, upsert } = useInvoicesStore();
  const { clients, init: initClients } = useClientsStore();
  const { quotes, init: initQuotes } = useQuotesStore();
  const { settings, init: initSettings } = useSettingsStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Client state
  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAddress, setClientAddress] = useState("");

  // Invoice state
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [quoteId, setQuoteId] = useState("");
  const [items, setItems] = useState<LineItem[]>([createEmptyItem()]);
  const [notes, setNotes] = useState("");
  const [taxRate, setTaxRate] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [dueDate, setDueDate] = useState("");
  const [amountPaid, setAmountPaid] = useState(0);

  const draftIdRef = useRef<string | null>(null);
  if (!isEdit && !draftIdRef.current) {
    draftIdRef.current = createId();
  }
  const effectiveId = isEdit ? id ?? "" : draftIdRef.current!;

  useEffect(() => {
    const load = async () => {
      await Promise.all([initClients(), initQuotes(), initSettings()]);
      setLoading(false);
    };
    load();
  }, [initClients, initQuotes, initSettings]);

  // Load existing invoice or create from quote
  useEffect(() => {
    if (loading) return;

    if (isEdit && id) {
      const existing = invoices.find((i) => i.id === id);
      if (existing) {
        setClientId(existing.clientId);
        setClientName(existing.clientName || "");
        setClientPhone(existing.clientPhone || "");
        setClientEmail(existing.clientEmail || "");
        setClientAddress(existing.clientAddress || "");
        setInvoiceNumber(existing.invoiceNumber || "");
        setQuoteId(existing.quoteId || "");
        setItems(existing.items || [createEmptyItem()]);
        setNotes(existing.notes || "");
        setTaxRate(existing.taxRate || 0);
        setDiscount(existing.discount || 0);
        setAmountPaid(existing.amountPaid || 0);
        if (existing.dueDate) {
          setDueDate(new Date(existing.dueDate).toISOString().split("T")[0]);
        }
      }
    } else if (quoteIdFromUrl) {
      // Create invoice from quote
      const quote = quotes.find((q) => q.id === quoteIdFromUrl);
      if (quote) {
        setClientId(quote.clientId);
        setClientName(quote.clientName || "");
        setClientPhone(quote.clientPhone || "");
        setClientEmail(quote.clientEmail || "");
        setClientAddress(quote.clientAddress || "");
        setQuoteId(quote.id);
        setItems(quote.items || [createEmptyItem()]);
        setNotes(quote.notes || "");
        setTaxRate(quote.taxRate || 0);
        setDiscount(quote.discount || 0);

        // Generate invoice number
        const seq = settings?.nextSequence ?? 1;
        setInvoiceNumber(formatInvoiceId(new Date(), seq));
      }
    } else if (settings) {
      // New invoice
      setTaxRate(settings.defaultTaxRate || 0);
      const seq = settings.nextSequence ?? 1;
      setInvoiceNumber(formatInvoiceId(new Date(), seq));
    }
  }, [loading, isEdit, id, quoteIdFromUrl, invoices, quotes, settings]);

  const totals = useMemo(
    () => calcTotals(items, taxRate, discount),
    [items, taxRate, discount]
  );

  const updateItem = (itemId: string, patch: Partial<LineItem>) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const next = { ...it, ...patch };
        next.total = (next.qty || 0) * (next.unitPrice || 0);
        return next;
      })
    );
  };

  const addItem = () => setItems((prev) => [...prev, createEmptyItem()]);
  const removeItem = (itemId: string) => {
    setItems((prev) => {
      const next = prev.filter((it) => it.id !== itemId);
      return next.length ? next : [createEmptyItem()];
    });
  };

  const handleSave = async () => {
    if (!clientName.trim()) {
      alert("Please select or enter a client.");
      return;
    }

    setSaving(true);

    try {
      const now = Date.now();

      // Calculate status based on payment
      let status: Invoice["status"] = "unpaid";
      if (amountPaid >= totals.total) {
        status = "paid";
      } else if (amountPaid > 0) {
        status = "partial";
      }

      const invoice: Partial<Invoice> = {
        id: effectiveId,
        invoiceNumber,
        clientId,
        quoteId: quoteId || undefined,
        clientName: clientName.trim(),
        clientPhone,
        clientEmail,
        clientAddress,
        items,
        subtotal: totals.subtotal,
        taxRate,
        tax: totals.tax,
        discount,
        total: totals.total,
        amountPaid,
        status,
        dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
        notes,
      };

      await upsert(invoice);
      navigate("/invoices");
    } catch (err) {
      console.error(err);
      alert("Failed to save invoice.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-400">Loading…</div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6 text-[#f5f3da]">
      {/* Header */}
      <h1 className="text-2xl font-semibold text-[#e8d487] flex items-center gap-3">
        <span>{isEdit ? "Edit Invoice" : "New Invoice"}</span>
        {invoiceNumber && (
          <span className="text-xs px-2 py-1 rounded-full border border-[#e8d487]/60 text-[#e8d487]">
            {invoiceNumber}
          </span>
        )}
      </h1>

      {/* Client Section */}
      <div className="card p-4 space-y-4">
        <h2 className="text-lg font-semibold border-l-2 border-[#e8d487] pl-2">
          Client
        </h2>

        <ClientAutocomplete
          value={clientId ? clients.find((c) => c.id === clientId) ?? null : null}
          onChange={(c) => {
            if (!c) {
              setClientId("");
              setClientName("");
              setClientPhone("");
              setClientEmail("");
              setClientAddress("");
              return;
            }
            setClientId(c.id);
            setClientName(c.name);
            setClientPhone(c.phone ?? "");
            setClientEmail(c.email ?? "");
            setClientAddress(c.address ?? "");
          }}
          label="Client"
          placeholder="Search clients…"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Phone</label>
            <input
              className="input w-full"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Email</label>
            <input
              className="input w-full"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-gray-400 block mb-1">Address</label>
            <textarea
              className="input w-full h-20"
              value={clientAddress}
              onChange={(e) => setClientAddress(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* From Quote */}
      {quoteId && (
        <div className="card p-4">
          <div className="text-sm text-gray-400">
            Created from Quote:{" "}
            <span className="text-[#e8d487]">{quoteId}</span>
          </div>
        </div>
      )}

      {/* Due Date */}
      <div className="card p-4">
        <label className="text-xs text-gray-400 block mb-1">Due Date</label>
        <input
          type="date"
          className="input w-full md:w-64"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>

      {/* Line Items */}
      <div className="card p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold border-l-2 border-[#e8d487] pl-2">
            Line Items
          </h2>
          <button className="btn-outline-gold text-sm" onClick={addItem}>
            + Add Item
          </button>
        </div>

        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-black/40 rounded-lg p-4 space-y-3 border border-[#2a2a2a]"
            >
              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  Description
                </label>
                <input
                  className="input w-full"
                  value={item.description}
                  onChange={(e) =>
                    updateItem(item.id, { description: e.target.value })
                  }
                />
              </div>

              {item.serviceDescription && (
                <div>
                  <label className="text-xs text-gray-400 block mb-1">
                    Service Description
                  </label>
                  <textarea
                    className="input w-full h-16"
                    value={item.serviceDescription}
                    onChange={(e) =>
                      updateItem(item.id, { serviceDescription: e.target.value })
                    }
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Qty</label>
                  <input
                    type="number"
                    className="input w-full"
                    value={item.qty}
                    onChange={(e) =>
                      updateItem(item.id, { qty: Number(e.target.value) })
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
                    value={item.unitPrice}
                    onChange={(e) =>
                      updateItem(item.id, { unitPrice: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="flex flex-col justify-between">
                  <label className="text-xs text-gray-400 block mb-1">
                    Total
                  </label>
                  <div className="flex items-center justify-between">
                    <span className="text-[#f5f3da]">
                      ${item.total.toFixed(2)}
                    </span>
                    <button
                      className="text-red-500 text-xs"
                      onClick={() => removeItem(item.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notes & Totals */}
      <div className="card p-4 grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4">
        <div>
          <h2 className="text-lg font-semibold border-l-2 border-[#e8d487] pl-2 mb-2">
            Notes
          </h2>
          <textarea
            className="input w-full h-32"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div>
          <h2 className="text-lg font-semibold border-l-2 border-[#e8d487] pl-2 mb-2">
            Totals
          </h2>
          <div className="bg-black/40 border border-[#2a2a2a] rounded-lg p-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>${totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Tax Rate</span>
              <input
                type="number"
                step="0.001"
                className="input w-24 text-right"
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
              />
            </div>
            <div className="flex justify-between">
              <span>Tax</span>
              <span>${totals.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Discount</span>
              <input
                type="number"
                step="0.01"
                className="input w-24 text-right"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
              />
            </div>
            <div className="pt-3 border-t border-[#3a3a3a]">
              <div className="flex justify-between text-[#e8d487] font-semibold text-xl">
                <span>Total</span>
                <span>${totals.total.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-[#3a3a3a]">
              <span>Amount Paid</span>
              <input
                type="number"
                step="0.01"
                className="input w-24 text-right"
                value={amountPaid}
                onChange={(e) => setAmountPaid(Number(e.target.value))}
              />
            </div>
            <div className="flex justify-between font-semibold">
              <span>Balance Due</span>
              <span
                className={
                  totals.total - amountPaid > 0
                    ? "text-yellow-400"
                    : "text-emerald-400"
                }
              >
                ${(totals.total - amountPaid).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Save Bar */}
      <div className="sticky bottom-0 left-0 right-0 border-t border-[#2a2a2a] bg-[#050505]/95 backdrop-blur mt-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="text-xs text-gray-400">
            {isEdit ? "Editing invoice" : "Creating invoice"}
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
              {saving ? "Saving…" : isEdit ? "Save Invoice" : "Create Invoice"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
