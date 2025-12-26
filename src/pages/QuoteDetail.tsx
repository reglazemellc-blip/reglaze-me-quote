// src/pages/QuoteDetail.tsx
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useConfigStore } from "@store/useConfigStore";
import { generateQuotePDF, generateQuotePDFBlob } from "@utils/pdf";
import { shareDocument, generateQuoteEmail } from "@utils/share";

import type {
  Quote,
  LineItem,
  QuoteClientSnapshot,
  Attachment,
  Invoice,
  WorkflowStatus,
} from "@db/index";
import { useToastStore } from "@store/useToastStore";
import { useInvoicesStore } from "@store/useInvoicesStore";
import { setDoc } from "firebase/firestore";
import { Clock, FileText, Calendar, Send, CheckCircle2, X } from "lucide-react";

// Time options for dropdown
const timeOptions = [
  "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM",
  "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
  "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM",
  "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM", "6:00 PM"
];

// Workflow status configuration
const workflowStatuses: { value: WorkflowStatus; label: string; color: string; bgColor: string }[] = [
  { value: "new", label: "New", color: "text-gray-400", bgColor: "bg-gray-600" },
  { value: "docs_sent", label: "Docs Sent", color: "text-yellow-400", bgColor: "bg-yellow-600" },
  { value: "waiting_prejob", label: "Waiting Pre-Job", color: "text-orange-400", bgColor: "bg-orange-600" },
  { value: "ready_to_schedule", label: "Ready to Schedule", color: "text-cyan-400", bgColor: "bg-cyan-600" },
  { value: "scheduled", label: "Scheduled", color: "text-blue-400", bgColor: "bg-blue-600" },
  { value: "in_progress", label: "In Progress", color: "text-indigo-400", bgColor: "bg-indigo-600" },
  { value: "completed", label: "Completed", color: "text-green-400", bgColor: "bg-green-600" },
  { value: "invoiced", label: "Invoiced", color: "text-purple-400", bgColor: "bg-purple-600" },
  { value: "paid", label: "Paid", color: "text-emerald-400", bgColor: "bg-emerald-600" },
];


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
  // Workflow fields
  workflowStatus?: WorkflowStatus;
  documentTracking?: {
    preJobSent?: number;
    preJobReceived?: number;
    preJobAttachmentId?: string;
    prepCareSent?: number;
  };
  scheduledDate?: string;
  scheduledTime?: string;
};

export default function QuoteDetail() {
  const { id } = useParams();
  const quoteId = id ?? "";
  const navigate = useNavigate();
const { getByQuote, upsertInvoice } = useInvoicesStore();

  
  const { config, init: initConfig } = useConfigStore();


  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<SafeQuote | null>(null);
  const [converting, setConverting] = useState(false);
  const [acknowledgeSaving, setAcknowledgeSaving] = useState(false);

  // Schedule modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

 useEffect(() => {
  initConfig();
}, [initConfig]);



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

          // Workflow fields
          workflowStatus: data.workflowStatus ?? "new",
          documentTracking: data.documentTracking ?? {},
          scheduledDate: data.scheduledDate ?? null,
          scheduledTime: data.scheduledTime ?? null,
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
        tenantId: useConfigStore.getState().activeTenantId,
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

  const handleShareQuote = async () => {
    if (!quote || !config || !quote.client) {
      useToastStore.getState().show("Unable to share quote. Missing quote or client data.")
      return
    }

    // Check if jobsite readiness is acknowledged
    if (!quote.jobsiteReadyAcknowledged) {
      useToastStore.getState().show("Please acknowledge jobsite readiness before sharing.")
      return
    }

    try {
      // Generate PDF using quote.client
      const { blob, filename } = await generateQuotePDFBlob(quote as any, quote.client as any, config.businessProfile)

      // Generate professional email text
      const clientName = quote.client?.name || quote.clientName || 'Customer'
      const emailText = generateQuoteEmail({
        clientName,
        companyName: config.businessProfile.companyName,
        quoteNumber: quote.quoteNumber || quote.id,
        total: quote.total || 0,
        notes: quote.notes,
        phone: config.businessProfile.phone,
        email: config.businessProfile.email,
      })

      await shareDocument({
        title: `Quote from ${config.businessProfile.companyName}`,
        message: emailText,
        pdfBlob: blob,
        pdfFileName: filename,
        clientEmail: quote.client?.email || '',
      })

      useToastStore.getState().show("PDF downloaded! Attach it to the email.")
    } catch (error: any) {
      // User cancelled share dialog
      if (error.name === 'AbortError') {
        return
      }
      console.error('Error sharing quote:', error)
      useToastStore.getState().show("Failed to share quote")
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
  tenantId: useConfigStore.getState().activeTenantId,
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
            onClick={handleShareQuote}
            className="btn-primary px-4 py-1 text-sm"
          >
            Share Quote
          </button>

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

      {/* WORKFLOW STATUS PIPELINE */}
      <div className="card p-4 md:p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[#e8d487] flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Job Workflow
          </h2>

          {/* Status Dropdown */}
          <select
            className="input text-xs md:text-sm"
            value={quote.workflowStatus ?? 'new'}
            onChange={async (e) => {
              const next = e.target.value as WorkflowStatus
              const quoteRef = doc(db, 'quotes', quote.id)
              await setDoc(quoteRef, {
                workflowStatus: next,
                updatedAt: Date.now(),
              }, { merge: true })
              setQuote({ ...quote, workflowStatus: next })
              useToastStore.getState().show(`Status updated to ${workflowStatuses.find(s => s.value === next)?.label}`)
            }}
          >
            {workflowStatuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        {/* Pipeline Visualization */}
        <div className="overflow-x-auto pb-2">
          <div className="flex items-center gap-1 min-w-max">
            {workflowStatuses.map((status, idx) => {
              const currentIdx = workflowStatuses.findIndex(
                (s) => s.value === (quote.workflowStatus ?? 'new')
              )
              const isCompleted = idx < currentIdx
              const isCurrent = idx === currentIdx

              return (
                <div key={status.value} className="flex items-center">
                  <button
                    onClick={async () => {
                      const quoteRef = doc(db, 'quotes', quote.id)
                      await setDoc(quoteRef, {
                        workflowStatus: status.value,
                        updatedAt: Date.now(),
                      }, { merge: true })
                      setQuote({ ...quote, workflowStatus: status.value })
                      useToastStore.getState().show(`Status updated to ${status.label}`)
                    }}
                    className={`
                      flex flex-col items-center justify-center px-2 py-2 rounded-lg transition-all
                      min-w-[70px] md:min-w-[80px]
                      ${isCurrent
                        ? `${status.bgColor} text-white ring-2 ring-[#e8d487] ring-offset-2 ring-offset-black`
                        : isCompleted
                          ? 'bg-green-900/50 text-green-300 border border-green-700/50'
                          : 'bg-black/30 text-gray-500 border border-gray-700/50 hover:bg-black/50'
                      }
                    `}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 mb-1" />
                    ) : isCurrent ? (
                      <div className="w-3 h-3 rounded-full bg-white mb-1 animate-pulse" />
                    ) : (
                      <div className="w-3 h-3 rounded-full border border-gray-500 mb-1" />
                    )}
                    <span className="text-[10px] md:text-[11px] font-medium text-center leading-tight">
                      {status.label}
                    </span>
                  </button>

                  {idx < workflowStatuses.length - 1 && (
                    <div className={`w-4 h-0.5 ${isCompleted ? 'bg-green-500' : 'bg-gray-700'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Document Tracking & Scheduling Info */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {/* Document Status */}
          <div className="bg-black/30 rounded-lg p-3 border border-gray-700/50">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-[#e8d487]" />
              <span className="font-medium text-gray-300">Documents</span>
            </div>
            <div className="space-y-1 text-gray-400">
              <div className="flex items-center justify-between">
                <span>Pre-Job Sent:</span>
                <span className={quote.documentTracking?.preJobSent ? 'text-green-400' : 'text-gray-500'}>
                  {quote.documentTracking?.preJobSent
                    ? new Date(quote.documentTracking.preJobSent).toLocaleDateString()
                    : 'Not sent'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Pre-Job Received:</span>
                <span className={quote.documentTracking?.preJobReceived ? 'text-green-400' : 'text-gray-500'}>
                  {quote.documentTracking?.preJobReceived
                    ? new Date(quote.documentTracking.preJobReceived).toLocaleDateString()
                    : 'Not received'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Prep & Care Sent:</span>
                <span className={quote.documentTracking?.prepCareSent ? 'text-green-400' : 'text-gray-500'}>
                  {quote.documentTracking?.prepCareSent
                    ? new Date(quote.documentTracking.prepCareSent).toLocaleDateString()
                    : 'Not sent'}
                </span>
              </div>
            </div>
          </div>

          {/* Schedule Info */}
          <div className="bg-black/30 rounded-lg p-3 border border-gray-700/50">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-[#e8d487]" />
              <span className="font-medium text-gray-300">Schedule</span>
            </div>
            {quote.scheduledDate ? (
              <div className="text-gray-300">
                <div className="text-lg font-semibold text-[#e8d487]">
                  {new Date(quote.scheduledDate + 'T12:00:00').toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  })}
                </div>
                {quote.scheduledTime && (
                  <div className="text-gray-400">@ {quote.scheduledTime}</div>
                )}
              </div>
            ) : (
              <div className="text-gray-500">Not scheduled</div>
            )}
            <button
              className="mt-2 text-[#e8d487] underline text-[11px]"
              onClick={() => {
                setScheduleDate(quote.scheduledDate || '');
                setScheduleTime(quote.scheduledTime || '');
                setShowScheduleModal(true);
              }}
            >
              {quote.scheduledDate ? 'Change Schedule' : 'Set Schedule'}
            </button>
          </div>

          {/* Quick Actions */}
          <div className="bg-black/30 rounded-lg p-3 border border-gray-700/50">
            <div className="flex items-center gap-2 mb-2">
              <Send className="w-4 h-4 text-[#e8d487]" />
              <span className="font-medium text-gray-300">Quick Actions</span>
            </div>
            <div className="space-y-2">
              <button
                className="w-full text-left px-2 py-1.5 rounded bg-black/30 text-gray-300 hover:bg-black/50 transition text-[11px]"
                onClick={async () => {
                  const quoteRef = doc(db, 'quotes', quote.id)
                  await setDoc(quoteRef, {
                    'documentTracking.preJobSent': Date.now(),
                    workflowStatus: 'docs_sent',
                    updatedAt: Date.now(),
                  }, { merge: true })
                  setQuote({
                    ...quote,
                    documentTracking: { ...quote.documentTracking, preJobSent: Date.now() },
                    workflowStatus: 'docs_sent'
                  })
                  useToastStore.getState().show('Marked Pre-Job as sent')
                }}
              >
                ✓ Mark Pre-Job Sent
              </button>
              <button
                className="w-full text-left px-2 py-1.5 rounded bg-black/30 text-gray-300 hover:bg-black/50 transition text-[11px]"
                onClick={async () => {
                  const quoteRef = doc(db, 'quotes', quote.id)
                  await setDoc(quoteRef, {
                    'documentTracking.preJobReceived': Date.now(),
                    workflowStatus: 'ready_to_schedule',
                    updatedAt: Date.now(),
                  }, { merge: true })
                  setQuote({
                    ...quote,
                    documentTracking: { ...quote.documentTracking, preJobReceived: Date.now() },
                    workflowStatus: 'ready_to_schedule'
                  })
                  useToastStore.getState().show('Marked Pre-Job as received - Ready to schedule!')
                }}
              >
                ✓ Mark Pre-Job Received
              </button>
              <button
                className="w-full text-left px-2 py-1.5 rounded bg-black/30 text-gray-300 hover:bg-black/50 transition text-[11px]"
                onClick={async () => {
                  const quoteRef = doc(db, 'quotes', quote.id)
                  await setDoc(quoteRef, {
                    'documentTracking.prepCareSent': Date.now(),
                    updatedAt: Date.now(),
                  }, { merge: true })
                  setQuote({
                    ...quote,
                    documentTracking: { ...quote.documentTracking, prepCareSent: Date.now() }
                  })
                  useToastStore.getState().show('Marked Prep & Care as sent')
                }}
              >
                ✓ Mark Prep & Care Sent
              </button>
            </div>
          </div>
        </div>
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

      {/* SCHEDULE MODAL */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#e8d487]">Schedule Job</h3>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Date Picker */}
              <div>
                <label className="block text-sm text-gray-300 mb-2">Date</label>
                <input
                  type="date"
                  className="input w-full"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                />
              </div>

              {/* Time Dropdown */}
              <div>
                <label className="block text-sm text-gray-300 mb-2">Time</label>
                <select
                  className="input w-full"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                >
                  <option value="">Select a time...</option>
                  {timeOptions.map((time) => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  className="btn-gold flex-1"
                  onClick={async () => {
                    const quoteRef = doc(db, 'quotes', quote.id);
                    await setDoc(quoteRef, {
                      scheduledDate: scheduleDate || null,
                      scheduledTime: scheduleTime || null,
                      workflowStatus: scheduleDate ? 'scheduled' : quote.workflowStatus,
                      updatedAt: Date.now(),
                    }, { merge: true });
                    setQuote({
                      ...quote,
                      scheduledDate: scheduleDate || undefined,
                      scheduledTime: scheduleTime || undefined,
                      workflowStatus: scheduleDate ? 'scheduled' : quote.workflowStatus
                    });
                    setShowScheduleModal(false);
                    if (scheduleDate) {
                      useToastStore.getState().show('Job scheduled!');
                    }
                  }}
                >
                  Save Schedule
                </button>
                <button
                  className="btn-outline-gold flex-1"
                  onClick={() => setShowScheduleModal(false)}
                >
                  Cancel
                </button>
              </div>

              {/* Clear Schedule */}
              {quote.scheduledDate && (
                <button
                  className="w-full text-red-400 text-sm underline mt-2"
                  onClick={async () => {
                    const quoteRef = doc(db, 'quotes', quote.id);
                    await setDoc(quoteRef, {
                      scheduledDate: null,
                      scheduledTime: null,
                      updatedAt: Date.now(),
                    }, { merge: true });
                    setQuote({
                      ...quote,
                      scheduledDate: undefined,
                      scheduledTime: undefined,
                    });
                    setShowScheduleModal(false);
                    useToastStore.getState().show('Schedule cleared');
                  }}
                >
                  Clear Schedule
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
