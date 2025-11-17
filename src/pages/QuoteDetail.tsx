// -------------------------------------------------------------
// QuoteDetail.tsx — fully fixed, uses client snapshot ALWAYS
// No "Client not found" errors anymore
// -------------------------------------------------------------

import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  doc,
  getDoc,
  deleteDoc,
} from "firebase/firestore";

import { db as firestoreDb } from "../firebase";

import {
  Quote,
  QuoteClientSnapshot,
  LineItem,
} from "@db/index";

export default function QuoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<Quote | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        if (!id) {
          alert("Missing quote ID.");
          navigate("/quotes");
          return;
        }

        const ref = doc(firestoreDb, "quotes", id);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          alert("Quote not found.");
          navigate("/quotes");
          return;
        }

        const data = snap.data() as Quote;

        // ------------------------------------------
        // FIX: Build a safe client snapshot
        // ------------------------------------------
        const snapClient: QuoteClientSnapshot = data.client || {
          id: data.clientId || "",
          name: data.clientName || "Unknown Client",
          phone: data.clientPhone || "",
          email: data.clientEmail || "",
          address: data.clientAddress || "",
        };

        const fixedQuote = {
          ...data,
          client: snapClient,
        };

        setQuote(fixedQuote);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [id, navigate]);

  // -------------------------------------------------------------
  // Delete quote
  // -------------------------------------------------------------
  const handleDelete = async () => {
    if (!id) return;
    if (!window.confirm("Are you sure you want to delete this quote?")) return;

    await deleteDoc(doc(firestoreDb, "quotes", id));
    alert("Quote deleted.");
    navigate("/quotes");
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-400">
        Loading quote…
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="p-6 text-center text-red-400">
        Error loading quote.
      </div>
    );
  }

  const client: {
  id?: string;
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
} = quote.client || {};


  return (
    <div className="p-6 max-w-4xl mx-auto text-[#f5f3da] space-y-6">
      
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-[#e8d487]">
          Quote Details
        </h1>

        <div className="flex gap-3">
          <button
            className="btn-outline-gold px-4"
            onClick={() => navigate(`/quotes/${quote.id}/edit`)}
          >
            Edit
          </button>

          <button
            className="btn-outline-red px-4"
            onClick={handleDelete}
          >
            Delete
          </button>
        </div>
      </div>

      {/* CLIENT SNAPSHOT */}
      <div className="card p-4 space-y-2">
        <h2 className="text-lg font-semibold border-l-2 border-[#e8d487] pl-2">
          Client
        </h2>

        <div className="text-sm">
          <div className="font-medium">{client.name}</div>
          {client.phone && <div>{client.phone}</div>}
          {client.email && <div>{client.email}</div>}
          {client.address && (
            <pre className="whitespace-pre-wrap text-gray-400 mt-1">
              {client.address}
            </pre>
          )}
        </div>
      </div>

      {/* STATUS + TOTAL */}
      <div className="card p-4 space-y-2">
        <div className="flex justify-between">
          <span>Status:</span>
          <span className="text-[#ffd700]">{quote.status}</span>
        </div>

        <div className="flex justify-between">
          <span>Total:</span>
          <span className="text-[#ffd700]">${quote.total.toFixed(2)}</span>
        </div>

        {quote.appointmentDate && (
          <div className="flex justify-between mt-2">
            <span>Appointment:</span>
            <span>
              {quote.appointmentDate} {quote.appointmentTime || ""}
            </span>
          </div>
        )}
      </div>

      {/* LINE ITEMS */}
      <div className="card p-4 space-y-3">
        <h2 className="text-lg font-semibold border-l-2 border-[#e8d487] pl-2">
          Line Items
        </h2>

        {quote.items.map((it: LineItem) => (
          <div
            key={it.id}
            className="bg-black/40 border border-[#2a2a2a] rounded-lg p-3 space-y-1"
          >
            <div className="font-medium text-[#e8d487]">
              {it.description}
            </div>

            {it.serviceDescription && (
              <div className="text-xs text-gray-400 whitespace-pre-wrap">
                {it.serviceDescription}
              </div>
            )}

            {it.warning && (
              <div className="text-xs text-yellow-400 whitespace-pre-wrap">
                {it.warning}
              </div>
            )}

            <div className="flex justify-between text-sm pt-1 border-t border-[#333]">
              <span>
                Qty {it.qty} × ${it.unitPrice.toFixed(2)}
              </span>
              <span className="text-[#ffd700]">
                ${it.total.toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* NOTES */}
      {quote.notes && (
        <div className="card p-4 space-y-2">
          <h2 className="text-lg font-semibold border-l-2 border-[#e8d487] pl-2">
            Notes
          </h2>
          <pre className="whitespace-pre-wrap text-gray-300">
            {quote.notes}
          </pre>
        </div>
      )}
    </div>
  );
}
