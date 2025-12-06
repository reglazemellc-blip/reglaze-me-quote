// src/pages/QuoteDetail.tsx
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useInvoicesStore } from "@store/useInvoicesStore";
import { useConfigStore } from "@store/useConfigStore";
import { generateQuotePDF } from "@utils/pdf";

import type {
  Quote,
  LineItem,
  QuoteClientSnapshot,
  Attachment,
  Invoice,
} from "@db/index";
import { useToastStore } from "@store/useToastStore";

// -------------------------------------------------------------
// FIX: SafeQuote overrides strict Quote fields and allows missing data
// -------------------------------------------------------------
type SafeQuote = Partial<Quote> & {
  id: string;
  clientId?: string;
  quoteNumber?: string | null;
  items: LineItem[];
  attachments: Attachment[];
  client: QuoteClientSnapshot;
};

export default function QuoteDetail() {
  const { id } = useParams();
  const quoteId = id ?? "";
  const navigate = useNavigate();

  const { upsert: upsertInvoice, getByQuote, init: initInvoices } = useInvoicesStore();
  const { config, init: initConfig } = useConfigStore();


  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<SafeQuote | null>(null);
  const [converting, setConverting] = useState(false);
  const [acknowledgeSaving, setAcknowledgeSaving] = useState(false);

  useEffect(() => {
  initInvoices();
  initConfig();
}, [initInvoices, initConfig]);


  const handleConvertToInvoice = async () => {
    if (!quote) return;

    // Check if invoice already exists
    const existing = getByQuote(quote.id);
    if (existing) {
      if (confirm('An invoice already exists for this quote. View it?')) {
        navigate(`/invoices/${existing.id}`);
      }
      return;
    }

    if (!confirm('Convert this quote to an invoice?')) return;

    setConverting(true);
    try {
      // Generate invoice number based on quote number
      // If quote is Q-0001, invoice becomes I-0001
      let invoiceNumber: string | undefined = undefined;
      if (quote.quoteNumber && quote.quoteNumber.startsWith('Q-')) {
        const quoteNum = quote.quoteNumber.substring(2); // Get the numeric part
        invoiceNumber = `I-${quoteNum}`;
      }

      const invoiceId = crypto.randomUUID ? crypto.randomUUID() : `inv-${Date.now()}`;

      const invoiceData: any = {
        id: invoiceId,
        clientId: quote.clientId || '',
        quoteId: quote.id,
        total: quote.total || 0,
        amountPaid: 0,
        status: 'unpaid',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Only add optional fields if they have values
      if (quote.dueDate) invoiceData.dueDate = quote.dueDate;
      if (quote.notes) invoiceData.notes = quote.notes;
      if (quote.attachments && quote.attachments.length > 0) invoiceData.attachments = quote.attachments;
      if (invoiceNumber) invoiceData.invoiceNumber = invoiceNumber;
      if (quote.jobsiteReadyAcknowledged) {
        invoiceData.jobsiteReadyAcknowledged = quote.jobsiteReadyAcknowledged;
        invoiceData.jobsiteReadyAcknowledgedAt = quote.jobsiteReadyAcknowledgedAt;
      }
      if (quote.waterShutoffElected) invoiceData.waterShutoffElected = quote.waterShutoffElected;

      await upsertInvoice(invoiceData as Invoice);
      useToastStore.getState().show("Invoice created successfully!");
      navigate(`/invoices/${invoiceId}`);
    } catch (err) {
      console.error('Convert error:', err);
      useToastStore.getState().show("Failed to create invoice");
    } finally {
      setConverting(false);
    }
  };

  useEffect(() => {
    if (!quoteId) return;

    async function load() {
      try {
        const snap = await getDoc(doc(db, "quotes", quoteId));

        if (!snap.exists()) {
          useToastStore.getState().show("Quote not found");
          navigate("/quotes");
          return;
        }

        const data = snap.data() as any;

        const client: QuoteClientSnapshot = {
          id: data.clientId || data.client?.id || "",
          name: data.clientName || data.client?.name || "",
          phone: data.clientPhone || data.client?.phone || "",
          email: data.clientEmail || data.client?.email || "",
          address: data.clientAddress || data.client?.address || "",
        };

        const items: LineItem[] = Array.isArray(data.items)
          ? data.items.map((it: any) => ({
              id: String(it.id),
              description: it.description ?? "",
              serviceDescription: it.serviceDescription ?? "",
              qty: Number(it.qty ?? 0),
              unitPrice: Number(it.unitPrice ?? 0),
              total: Number(it.total ?? 0),
              warning: it.warning ?? "",
            }))
          : [];

        const attachments: Attachment[] = Array.isArray(data.attachments)
          ? data.attachments.map((a: any) => ({
              id: a.id ?? "",
              name: a.name ?? "Attachment",
              url: a.url ?? "",
              type: a.type ?? "photo",
              createdAt: a.createdAt ?? Date.now(),
              path: a.path ?? "",
              conversationId: a.conversationId ?? undefined,
            }))
          : [];

        const fixed: SafeQuote = {
          id: quoteId,
          clientId: client.id,
          client,

          clientName: client.name,
          clientPhone: client.phone,
          clientEmail: client.email,
          clientAddress: client.address,

          quoteNumber: data.quoteNumber ?? null,

          items,
          attachments,

          notes: data.notes ?? "",

          subtotal: data.subtotal ?? 0,
          taxRate: data.taxRate ?? 0,
          tax: data.tax ?? 0,
          discount: data.discount ?? 0,
          total: data.total ?? 0,

          status: data.status ?? "pending",

          appointmentDate: data.appointmentDate ?? null,
          appointmentTime: data.appointmentTime ?? null,
          pdfUrl: data.pdfUrl ?? null,
          sentAt: data.sentAt ?? null,
          expiresAt: data.expiresAt ?? null,

          createdAt: data.createdAt ?? 0,
          updatedAt: data.updatedAt ?? 0,
          
          jobsiteReadyAcknowledged: data.jobsiteReadyAcknowledged ?? false,
          jobsiteReadyAcknowledgedAt: data.jobsiteReadyAcknowledgedAt,
          waterShutoffElected: data.waterShutoffElected ?? false,
        };

        setQuote(fixed);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [quoteId, navigate]);

  const handleGeneratePDF = async () => {
    if (!quote || !config) {
      useToastStore.getState().show("Unable to generate PDF. Missing quote or client data.")
      return
    }
    
    // Check if jobsite readiness is acknowledged
    if (!quote.jobsiteReadyAcknowledged) {
      useToastStore.getState().show("Please acknowledge jobsite readiness before generating the PDF.")
      return
    }
    
    try {
      // Convert SafeQuote client snapshot to full Client object for PDF
      const client = {
        id: quote.client.id || quote.clientId || '',
        name: quote.client.name || quote.clientName || '',
        phone: quote.client.phone || quote.clientPhone || '',
        email: quote.client.email || quote.clientEmail || '',
        address: quote.client.address || quote.clientAddress || '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      await generateQuotePDF(quote as any, client, config.businessProfile)
    } catch (error) {
      console.error('Error generating PDF:', error)
      useToastStore.getState().show("Failed to generate PDF")
    }
  }

  const handleToggleAcknowledgment = async () => {
    if (!quote) return
    
    setAcknowledgeSaving(true)
    try {
      const newValue = !quote.jobsiteReadyAcknowledged
      const timestamp = newValue ? Date.now() : undefined
      
      const { setDoc } = await import('firebase/firestore')
      const quoteRef = doc(db, 'quotes', quote.id)
      await setDoc(quoteRef, {
        jobsiteReadyAcknowledged: newValue,
        jobsiteReadyAcknowledgedAt: timestamp,
        updatedAt: Date.now()
      }, { merge: true })
      
      setQuote({
        ...quote,
        jobsiteReadyAcknowledged: newValue,
        jobsiteReadyAcknowledgedAt: timestamp,
        updatedAt: Date.now()
      })
    } catch (error) {
      console.error('Error updating acknowledgment:', error)
      useToastStore.getState().show("Failed to update acknowledgment")
    } finally {
      setAcknowledgeSaving(false)
    }
  }

  const handleToggleWaterShutoff = async () => {
    if (!quote) return
    
    // Check if locked (PDF has been generated)
    if (quote.pdfUrl) {
      useToastStore.getState().show("Water shutoff election is locked after PDF generation.")
      return
    }
    
    setAcknowledgeSaving(true)
    try {
      const newValue = !quote.waterShutoffElected
      
      const { setDoc } = await import('firebase/firestore')
      const quoteRef = doc(db, 'quotes', quote.id)
      await setDoc(quoteRef, {
        waterShutoffElected: newValue,
        updatedAt: Date.now()
      }, { merge: true })
      
      setQuote({
        ...quote,
        waterShutoffElected: newValue,
        updatedAt: Date.now()
      })
    } catch (error) {
      console.error('Error updating water shutoff election:', error)
      useToastStore.getState().show("Failed to update water shutoff election")
    } finally {
      setAcknowledgeSaving(false)
    }
  }

  if (loading)
    return <div className="p-8 text-center text-gray-400">Loading quote…</div>;

  if (!quote)
    return (
      <div className="p-8 text-center text-red-400">Quote not found.</div>
    );

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto text-[#f5f3da]">
      {/* HEADER */}
            {/* HEADER */}
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-[#e8d487]">
            Quote Details
          </h1>
          {quote.quoteNumber && (
            <span className="text-xs px-2 py-1 rounded-full border border-[#e8d487]/60 text-[#e8d487] inline-block">
              {quote.quoteNumber}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleGeneratePDF}
            className="btn-outline-gold px-4 py-1 text-sm"
          >
            Generate PDF
          </button>

          <button
            onClick={handleConvertToInvoice}
            disabled={converting}
            className="btn-outline-gold px-4 py-1 text-sm"
          >
            {converting ? 'Converting...' : config?.labels?.quoteConvertToInvoiceButton || 'Convert to Invoice'}
          </button>

          <Link
            to={`/quotes/${quote.id}/edit`}
            className="btn-gold px-4 py-1 text-sm"
          >
            Edit
          </Link>
        </div>
      </div>


      {/* CLIENT CARD */}
      <div className="card p-4 space-y-1">
        <div className="text-lg font-semibold">{quote.clientName}</div>
        <div className="text-sm text-gray-400">{quote.clientPhone}</div>
        <div className="text-sm text-gray-400">{quote.clientEmail}</div>
        <div className="text-sm whitespace-pre-line text-gray-300">
          {quote.clientAddress}
        </div>

        {quote.clientId && (
          <Link
            to={`/clients/${quote.clientId}`}
            className="text-gold underline text-sm mt-2 inline-block"
          >
            View Client
          </Link>
        )}
      </div>

      {/* STATUS */}
      <div className="card p-4">
        <div className="text-sm text-gray-400">Status</div>
        <div className="text-lg font-semibold capitalize">
          {quote.status}
        </div>

        {quote.status === "scheduled" && (
          <div className="mt-2 text-sm text-gray-300">
            {quote.appointmentDate} @ {quote.appointmentTime}
          </div>
        )}
      </div>

      {/* ITEMS */}
      <div className="card p-4 space-y-3">
        <h2 className="text-lg font-semibold border-l-2 border-gold pl-2">
          Line Items
        </h2>

        {quote.items.length === 0 ? (
          <div className="text-gray-400">No items.</div>
        ) : (
          quote.items.map((it) => (
            <div
              key={it.id}
              className="bg-black/40 p-3 rounded border border-[#2a2a2a] space-y-1"
            >
              <div className="font-medium">{it.description}</div>
              {it.serviceDescription && (
                <div className="text-xs text-gray-400">
                  {it.serviceDescription}
                </div>
              )}

              {it.warning && (
                <div className="text-xs text-yellow-400">{it.warning}</div>
              )}

              <div className="text-sm text-gray-300 mt-1">
                Qty: {it.qty} × ${it.unitPrice.toFixed(2)}
              </div>

              <div className="text-right text-[#ffd700] font-semibold">
                ${it.total.toFixed(2)}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ATTACHMENTS */}
      <div className="card p-4">
        <h2 className="text-lg font-semibold border-l-2 border-gold pl-2">
          Attachments
        </h2>

        {quote.attachments.length === 0 ? (
          <div className="text-gray-400 text-sm mt-2">
            No attachments.
          </div>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {quote.attachments.map((a) => (
              <li key={a.id}>
                <a
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-gold underline"
                >
                  {a.name}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* NOTES */}
      <div className="card p-4">
        <h2 className="text-lg font-semibold border-l-2 border-gold pl-2">
          Notes
        </h2>
        <div className="mt-2 whitespace-pre-line text-sm text-gray-300">
          {quote.notes || "No notes"}
        </div>
      </div>

      {/* JOBSITE READINESS ACKNOWLEDGMENT */}
      <div className="card p-4">
        <h2 className="text-lg font-semibold border-l-2 border-gold pl-2 mb-3">
          Jobsite Readiness
        </h2>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-200 mb-2">
            Jobsite Readiness & Plumbing Requirement
          </h3>
          <p className="text-sm text-gray-400 leading-relaxed">
            All plumbing fixtures must be operational before refinishing begins.
            Faucets must shut off completely and drains must function properly.
            If plumbing or jobsite conditions prevent work from starting or finishing as scheduled, additional fees may apply.
          </p>
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={quote.jobsiteReadyAcknowledged || false}
            onChange={handleToggleAcknowledgment}
            disabled={acknowledgeSaving}
            className="w-5 h-5 rounded border-gray-600 text-[#e8d487] focus:ring-[#e8d487] focus:ring-offset-gray-900"
          />
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-200">
              I confirm the jobsite is fully ready and all plumbing fixtures are operational.
            </div>
            {quote.jobsiteReadyAcknowledged && quote.jobsiteReadyAcknowledgedAt && (
              <div className="text-xs text-gray-400 mt-1">
                Acknowledged on: {new Date(quote.jobsiteReadyAcknowledgedAt).toLocaleString()}
              </div>
            )}
          </div>
        </label>
        {!quote.jobsiteReadyAcknowledged && (
          <div className="text-xs text-yellow-500 mt-2">
            ⚠ This must be acknowledged before generating the PDF
          </div>
        )}
        
        {/* WATER SHUTOFF ELECTION (INTERNAL ONLY) */}
        {quote.jobsiteReadyAcknowledged && (
          <div className="mt-6 pt-6 border-t border-gray-700">
            <h3 className="text-sm font-semibold text-gray-200 mb-3">
              Water Shutoff Election (Internal)
            </h3>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={quote.waterShutoffElected || false}
                onChange={handleToggleWaterShutoff}
                disabled={acknowledgeSaving || !!quote.pdfUrl}
                className="w-5 h-5 rounded border-gray-600 text-red-500 focus:ring-red-500 focus:ring-offset-gray-900"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-200">
                  Allow water shutoff to continue work (voids warranty)
                </div>
                {quote.waterShutoffElected && (
                  <div className="text-xs text-red-400 mt-1">
                    ⚠ Warranty will be voided due to water shutoff
                  </div>
                )}
                {quote.pdfUrl && (
                  <div className="text-xs text-gray-500 mt-1">
                    🔒 Locked after PDF generation
                  </div>
                )}
              </div>
            </label>
          </div>
        )}
      </div>

      {/* TOTALS */}
      <div className="card p-4 space-y-1">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>${quote.subtotal?.toFixed(2)}</span>
        </div>

        <div className="flex justify-between">
          <span>Tax ({((quote.taxRate ?? 0) * 100).toFixed(1)}%)</span>
          <span>${quote.tax?.toFixed(2)}</span>
        </div>

        <div className="flex justify-between">
          <span>Discount</span>
          <span>${quote.discount?.toFixed(2)}</span>
        </div>

        <div className="flex justify-between border-t border-[#2a2a2a] pt-2 mt-2 text-[#ffd700] font-semibold text-lg">
          <span>Total</span>
          <span>${quote.total?.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
