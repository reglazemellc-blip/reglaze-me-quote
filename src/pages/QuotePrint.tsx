// src/pages/QuotePrint.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

import type {
  Quote,
  LineItem,
  QuoteClientSnapshot,
  Attachment,
} from "@db/index";
import { useToastStore } from "@store/useToastStore";

// Minimal safe type so we don't fight TS
type SafeQuote = Partial<Quote> & {
  id: string;
  clientId?: string;
  quoteNumber?: string | null;
  items: LineItem[];
  attachments: Attachment[];
  client: QuoteClientSnapshot;
};

export default function QuotePrint() {
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

  // auto open print dialog when loaded
  useEffect(() => {
    if (!loading && quote) {
      setTimeout(() => {
        window.print();
      }, 150);
    }
  }, [loading, quote]);

  if (loading || !quote) {
    return (
      <div className="p-8 text-center text-gray-600">Preparing PDF…</div>
    );
  }

  const formatMoney = (v?: number) =>
    `$${Number(v ?? 0).toFixed(2)}`;

  const createdDate = quote.createdAt
    ? new Date(quote.createdAt).toLocaleDateString()
    : "";

  return (
    <div
      style={{
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        backgroundColor: "#ffffff",
        color: "#111111",
        padding: "32px",
      }}
    >
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <div
            style={{
              fontSize: "20px",
              fontWeight: 700,
              marginBottom: "4px",
            }}
          >
            ReGlaze Me Quote
          </div>
          <div style={{ fontSize: "12px", color: "#555" }}>
            Quote #{quote.quoteNumber || quote.id}
          </div>
          {createdDate && (
            <div style={{ fontSize: "12px", color: "#555" }}>
              Date: {createdDate}
            </div>
          )}
        </div>

        <div style={{ textAlign: "right", fontSize: "12px" }}>
          <div style={{ fontWeight: 600 }}>Bill To</div>
          <div>{quote.clientName}</div>
          {quote.clientPhone && <div>{quote.clientPhone}</div>}
          {quote.clientEmail && <div>{quote.clientEmail}</div>}
          {quote.clientAddress && (
            <div style={{ whiteSpace: "pre-line" }}>
              {quote.clientAddress}
            </div>
          )}
        </div>
      </div>

      {/* ITEMS TABLE */}
      <div style={{ marginTop: "24px" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "12px",
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid #ccc",
                  padding: "6px",
                }}
              >
                Description
              </th>
              <th
                style={{
                  textAlign: "center",
                  borderBottom: "1px solid #ccc",
                  padding: "6px",
                  width: "60px",
                }}
              >
                Qty
              </th>
              <th
                style={{
                  textAlign: "right",
                  borderBottom: "1px solid #ccc",
                  padding: "6px",
                  width: "80px",
                }}
              >
                Unit
              </th>
              <th
                style={{
                  textAlign: "right",
                  borderBottom: "1px solid #ccc",
                  padding: "6px",
                  width: "90px",
                }}
              >
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((it) => (
              <tr key={it.id}>
                <td
                  style={{
                    padding: "6px",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  <div style={{ fontWeight: 500 }}>{it.description}</div>
                  {it.serviceDescription && (
                    <div style={{ color: "#555", marginTop: 2 }}>
                      {it.serviceDescription}
                    </div>
                  )}
                  {it.warning && (
                    <div
                      style={{
                        color: "#b45309",
                        marginTop: 2,
                        fontStyle: "italic",
                      }}
                    >
                      {it.warning}
                    </div>
                  )}
                </td>
                <td
                  style={{
                    padding: "6px",
                    textAlign: "center",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  {it.qty}
                </td>
                <td
                  style={{
                    padding: "6px",
                    textAlign: "right",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  {formatMoney(it.unitPrice)}
                </td>
                <td
                  style={{
                    padding: "6px",
                    textAlign: "right",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  {formatMoney(it.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* TOTALS */}
      <div
        style={{
          marginTop: "16px",
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <table
          style={{
            fontSize: "12px",
            minWidth: "220px",
          }}
        >
          <tbody>
            <tr>
              <td style={{ padding: "4px 8px" }}>Subtotal</td>
              <td style={{ padding: "4px 8px", textAlign: "right" }}>
                {formatMoney(quote.subtotal)}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "4px 8px" }}>
                Tax ({((quote.taxRate ?? 0) * 100).toFixed(1)}%)
              </td>
              <td style={{ padding: "4px 8px", textAlign: "right" }}>
                {formatMoney(quote.tax)}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "4px 8px" }}>Discount</td>
              <td style={{ padding: "4px 8px", textAlign: "right" }}>
                {formatMoney(quote.discount)}
              </td>
            </tr>
            <tr>
              <td
                style={{
                  padding: "6px 8px",
                  fontWeight: 700,
                  borderTop: "1px solid #ccc",
                }}
              >
                Total
              </td>
              <td
                style={{
                  padding: "6px 8px",
                  textAlign: "right",
                  fontWeight: 700,
                  borderTop: "1px solid #ccc",
                }}
              >
                {formatMoney(quote.total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* NOTES */}
      {quote.notes && (
        <div style={{ marginTop: "24px", fontSize: "12px" }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Notes</div>
          <div style={{ whiteSpace: "pre-line" }}>{quote.notes}</div>
        </div>
      )}

      <div
        style={{
          marginTop: "32px",
          fontSize: "10px",
          color: "#777",
          textAlign: "center",
        }}
      >
        Thank you for your business.
      </div>
    </div>
  );
}
