// -------------------------------------------------------------
// QuoteDetail.tsx — FULL PRO VERSION (Matches Send Workflow)
// -------------------------------------------------------------

import React, { useEffect, useState } from "react"
import { useNavigate, useParams, Link } from "react-router-dom"
import { doc, getDoc } from "firebase/firestore"
import { db } from "../firebase"
import type { Quote, LineItem } from "@db/index"

export default function QuoteDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [quote, setQuote] = useState<Quote | null>(null)

  useEffect(() => {
    const run = async () => {
      if (!id) return

      const ref = doc(db, "quotes", id)
      const snap = await getDoc(ref)

      if (!snap.exists()) {
        alert("Quote not found.")
        navigate("/quotes")
        return
      }

      setQuote(snap.data() as Quote)
      setLoading(false)
    }

    run()
  }, [id, navigate])

  if (loading) return <div className="p-6 text-gray-400">Loading…</div>
  if (!quote) return <div className="p-6">Quote not found.</div>

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-[#f5f3da]">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-[#e8d487]">
          Quote for {quote.clientName}
        </h1>

        <span className="px-3 py-1 text-xs rounded bg-black/40 text-gray-300">
          {quote.status}
        </span>
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex flex-wrap gap-3">

        {/* SEND QUOTE */}
        <button
          className="btn-gold"
          onClick={() => alert("Send Quote — coming in Step D Part 2")}
        >
          Send Quote
        </button>

        <Link to={`/quotes/${quote.id}/edit`} className="btn-outline-gold">
          Edit Quote
        </Link>

        <button className="btn-outline-gold">
          Duplicate
        </button>

        <button className="btn-outline-red">
          Delete Quote
        </button>
      </div>

      {/* CLIENT INFO */}
      <div className="card p-4 space-y-2">
        <h2 className="section-title">Client</h2>
        <p>{quote.clientName}</p>
        <p className="text-xs text-gray-400">Client ID: {quote.clientId}</p>
      </div>

      {/* LINE ITEMS */}
      <div className="card p-4 space-y-3">
        <h2 className="section-title">Line Items</h2>

        {quote.items.map((it: LineItem) => (
          <div
            key={it.id}
            className="flex justify-between border-b border-[#2a2a2a] py-2"
          >
            <div>
              <p>{it.description}</p>
              <p className="text-xs text-gray-400">
                Qty: {it.qty} × ${it.unitPrice.toFixed(2)}
              </p>
              {it.warning && (
                <p className="text-yellow-400 text-xs">{it.warning}</p>
              )}
            </div>

            <p className="text-[#e8d487] font-semibold">
              ${it.total.toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      {/* NOTES */}
      <div className="card p-4">
        <h2 className="section-title">Notes</h2>
        <p>{quote.notes || "No additional notes."}</p>
      </div>

      {/* TOTALS */}
      <div className="card p-4 space-y-2">
        <h2 className="section-title">Totals</h2>

        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>${quote.subtotal?.toFixed(2) || "0.00"}</span>
        </div>

        <div className="flex justify-between">
          <span>Tax ({(quote.taxRate ?? 0) * 100}%)</span>
          <span>${quote.tax?.toFixed(2) || "0.00"}</span>
        </div>

        <div className="flex justify-between">
          <span>Discount</span>
          <span>${quote.discount?.toFixed(2) || "0.00"}</span>
        </div>

        <div className="flex justify-between border-t border-[#2a2a2a] pt-2 mt-2">
          <span className="font-semibold text-[#e8d487]">Total</span>
          <span className="font-bold text-[#e8d487]">
            ${quote.total?.toFixed(2) || "0.00"}
          </span>
        </div>
      </div>

      {/* ATTACHMENTS */}
      <div className="card p-4 space-y-2">
        <h2 className="section-title">Attachments</h2>

        {quote.attachments?.length ? (
          quote.attachments.map((a: any, i: number) => (
            <div key={i} className="text-sm">
              {a.fileName || "Unnamed file"}
            </div>
          ))
        ) : (
          <p className="text-gray-400 text-sm">No attachments.</p>
        )}
      </div>

      {/* ACTIVITY */}
      <div className="card p-4 space-y-1">
        <h2 className="section-title">Activity</h2>
        <p className="text-sm text-gray-400">
          Sent: {quote.sentAt ? new Date(quote.sentAt).toLocaleString() : "Not sent"}
        </p>
        <p className="text-sm text-gray-400">
          Expires: {quote.expiresAt ? new Date(quote.expiresAt).toLocaleDateString() : "None"}
        </p>
      </div>
    </div>
  )
}
