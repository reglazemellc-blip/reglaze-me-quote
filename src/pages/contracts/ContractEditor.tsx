// -------------------------------------------------------------
// ContractEditor.tsx — Create or edit a contract
// -------------------------------------------------------------

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useContractsStore, formatContractId, DEFAULT_CONTRACT_TEMPLATE } from "@store/useContractsStore";
import { useClientsStore } from "@store/useClientsStore";
import { useQuotesStore } from "@store/useQuotesStore";
import { useInvoicesStore } from "@store/useInvoicesStore";
import type { Contract } from "@db/index";
import ClientAutocomplete from "@components/ClientAutocomplete";

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

export default function ContractEditor({ mode }: { mode: "create" | "edit" }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const quoteIdFromUrl = searchParams.get("quoteId");
  const invoiceIdFromUrl = searchParams.get("invoiceId");

  const isEdit = mode === "edit";

  const { contracts, upsert } = useContractsStore();
  const { clients, init: initClients } = useClientsStore();
  const { quotes, init: initQuotes } = useQuotesStore();
  const { invoices, init: initInvoices } = useInvoicesStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Client state
  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAddress, setClientAddress] = useState("");

  // Contract state
  const [contractNumber, setContractNumber] = useState("");
  const [title, setTitle] = useState("Service Agreement");
  const [content, setContent] = useState(DEFAULT_CONTRACT_TEMPLATE);
  const [terms, setTerms] = useState("");
  const [quoteId, setQuoteId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");

  const draftIdRef = useRef<string | null>(null);
  if (!isEdit && !draftIdRef.current) {
    draftIdRef.current = createId();
  }
  const effectiveId = isEdit ? id ?? "" : draftIdRef.current!;

  useEffect(() => {
    const load = async () => {
      await Promise.all([initClients(), initQuotes(), initInvoices()]);
      setLoading(false);
    };
    load();
  }, [initClients, initQuotes, initInvoices]);

  // Load existing contract or create from quote/invoice
  useEffect(() => {
    if (loading) return;

    if (isEdit && id) {
      const existing = contracts.find((c) => c.id === id);
      if (existing) {
        setClientId(existing.clientId);
        setClientName(existing.clientName || "");
        setClientPhone(existing.clientPhone || "");
        setClientEmail(existing.clientEmail || "");
        setClientAddress(existing.clientAddress || "");
        setContractNumber(existing.contractNumber || "");
        setTitle(existing.title);
        setContent(existing.content);
        setTerms(existing.terms || "");
        setQuoteId(existing.quoteId || "");
        setInvoiceId(existing.invoiceId || "");
      }
    } else if (quoteIdFromUrl) {
      // Create contract from quote
      const quote = quotes.find((q) => q.id === quoteIdFromUrl);
      if (quote) {
        setClientId(quote.clientId);
        setClientName(quote.clientName || "");
        setClientPhone(quote.clientPhone || "");
        setClientEmail(quote.clientEmail || "");
        setClientAddress(quote.clientAddress || "");
        setQuoteId(quote.id);
        setContractNumber(formatContractId(new Date(), 1));
      }
    } else if (invoiceIdFromUrl) {
      // Create contract from invoice
      const invoice = invoices.find((i) => i.id === invoiceIdFromUrl);
      if (invoice) {
        setClientId(invoice.clientId);
        setClientName(invoice.clientName || "");
        setClientPhone(invoice.clientPhone || "");
        setClientEmail(invoice.clientEmail || "");
        setClientAddress(invoice.clientAddress || "");
        setInvoiceId(invoice.id);
        setQuoteId(invoice.quoteId || "");
        setContractNumber(formatContractId(new Date(), 1));
      }
    } else {
      // New contract
      setContractNumber(formatContractId(new Date(), 1));
    }
  }, [loading, isEdit, id, quoteIdFromUrl, invoiceIdFromUrl, contracts, quotes, invoices]);

  const handleSave = async () => {
    if (!clientName.trim()) {
      alert("Please select or enter a client.");
      return;
    }

    setSaving(true);

    try {
      const contract: Partial<Contract> = {
        id: effectiveId,
        contractNumber,
        clientId,
        quoteId: quoteId || undefined,
        invoiceId: invoiceId || undefined,
        clientName: clientName.trim(),
        clientPhone,
        clientEmail,
        clientAddress,
        title,
        content,
        terms: terms || undefined,
        status: "draft",
      };

      await upsert(contract);
      navigate("/contracts");
    } catch (err) {
      console.error(err);
      alert("Failed to save contract.");
    } finally {
      setSaving(false);
    }
  };

  // Preview content with placeholders replaced
  const previewContent = () => {
    return content
      .replace(/\{\{clientName\}\}/g, clientName || "[Client Name]")
      .replace(/\{\{clientPhone\}\}/g, clientPhone || "[Phone]")
      .replace(/\{\{clientEmail\}\}/g, clientEmail || "[Email]")
      .replace(/\{\{clientAddress\}\}/g, clientAddress || "[Address]");
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-400">Loading…</div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6 text-[#f5f3da]">
      {/* Header */}
      <h1 className="text-2xl font-semibold text-[#e8d487] flex items-center gap-3">
        <span>{isEdit ? "Edit Contract" : "New Contract"}</span>
        {contractNumber && (
          <span className="text-xs px-2 py-1 rounded-full border border-[#e8d487]/60 text-[#e8d487]">
            {contractNumber}
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

      {/* Related Documents */}
      {(quoteId || invoiceId) && (
        <div className="card p-4">
          <div className="text-sm text-gray-400 space-y-1">
            {quoteId && (
              <div>
                From Quote:{" "}
                <span className="text-[#e8d487]">{quoteId}</span>
              </div>
            )}
            {invoiceId && (
              <div>
                From Invoice:{" "}
                <span className="text-[#e8d487]">{invoiceId}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contract Details */}
      <div className="card p-4 space-y-4">
        <h2 className="text-lg font-semibold border-l-2 border-[#e8d487] pl-2">
          Contract Details
        </h2>

        <div>
          <label className="text-xs text-gray-400 block mb-1">Title</label>
          <input
            className="input w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-1">
            Content (HTML)
          </label>
          <div className="text-xs text-gray-500 mb-2">
            Use placeholders: {"{{clientName}}"}, {"{{clientPhone}}"},{" "}
            {"{{clientEmail}}"}, {"{{clientAddress}}"}
          </div>
          <textarea
            className="input w-full h-64 font-mono text-xs"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-1">
            Additional Terms
          </label>
          <textarea
            className="input w-full h-24"
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            placeholder="Any additional terms or conditions…"
          />
        </div>
      </div>

      {/* Preview */}
      <div className="card p-4">
        <h2 className="text-lg font-semibold border-l-2 border-[#e8d487] pl-2 mb-4">
          Preview
        </h2>
        <div
          className="prose prose-invert max-w-none text-[#f5f3da] text-sm bg-black/40 p-4 rounded-lg"
          dangerouslySetInnerHTML={{ __html: previewContent() }}
        />
      </div>

      {/* Save Bar */}
      <div className="sticky bottom-0 left-0 right-0 border-t border-[#2a2a2a] bg-[#050505]/95 backdrop-blur mt-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="text-xs text-gray-400">
            {isEdit ? "Editing contract" : "Creating contract"}
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
              {saving ? "Saving…" : isEdit ? "Save Contract" : "Create Contract"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
