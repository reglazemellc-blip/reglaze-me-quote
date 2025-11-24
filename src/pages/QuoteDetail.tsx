// src/pages/QuoteDetail.tsx
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";


import type {
  Quote,
  LineItem,
  QuoteClientSnapshot,
  Attachment,
} from "@db/index";

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

  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<SafeQuote | null>(null);

  useEffect(() => {
    if (!quoteId) return;

    async function load() {
      try {
        const snap = await getDoc(doc(db, "quotes", quoteId));

        if (!snap.exists()) {
          alert("Quote not found");
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
        };

        setQuote(fixed);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [quoteId, navigate]);

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
            onClick={() => navigate(`/quotes/${quote.id}/print`)}
            className="btn-outline-gold px-4 py-1 text-sm"
          >
            Print / PDF
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
