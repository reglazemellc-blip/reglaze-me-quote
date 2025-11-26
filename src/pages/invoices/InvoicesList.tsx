// -------------------------------------------------------------
// InvoicesList.tsx — List all invoices
// -------------------------------------------------------------

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useInvoicesStore } from "@store/useInvoicesStore";
import { useClientsStore } from "@store/useClientsStore";
import type { InvoiceStatus } from "@db/index";

type FilterStatus = "all" | InvoiceStatus;

export default function InvoicesList() {
  const navigate = useNavigate();
  const { invoices, loading, init } = useInvoicesStore();
  const { clients, init: initClients } = useClientsStore();
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    init();
    initClients();
  }, [init, initClients]);

  const getClientName = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    return client?.name ?? "Unknown Client";
  };

  const filteredInvoices = useMemo(() => {
    return invoices
      .filter((inv) => {
        if (filter !== "all" && inv.status !== filter) return false;
        if (search) {
          const q = search.toLowerCase();
          const clientName = inv.clientName || getClientName(inv.clientId);
          return (
            clientName.toLowerCase().includes(q) ||
            inv.invoiceNumber?.toLowerCase().includes(q) ||
            inv.id.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [invoices, filter, search, clients]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (ts: number | undefined) => {
    if (!ts) return "";
    return new Date(ts).toLocaleDateString();
  };

  const statusStyles: Record<InvoiceStatus, string> = {
    unpaid: "border-yellow-500/60 text-yellow-300",
    partial: "border-orange-500/60 text-orange-300",
    paid: "border-emerald-500/60 text-emerald-300",
    overdue: "border-red-500/60 text-red-300",
    refunded: "border-gray-500/60 text-gray-300",
  };

  const statusLabels: Record<InvoiceStatus, string> = {
    unpaid: "Unpaid",
    partial: "Partial",
    paid: "Paid",
    overdue: "Overdue",
    refunded: "Refunded",
  };

  const pillClass = (active: boolean) =>
    `px-3 py-1 rounded-full border text-xs cursor-pointer transition ${
      active
        ? "border-[#e8d487] text-[#e8d487] bg-black/60"
        : "border-[#2a2414] text-gray-400 hover:border-[#e8d487]/60 hover:text-[#e8d487]"
    }`;

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-400">Loading invoices…</div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-[#e8d487]">
          <span className="border-l-2 border-[#e8d487] pl-2">Invoices</span>
        </h1>

        <button
          onClick={() => navigate("/invoices/new")}
          className="btn-outline-gold px-4 py-2"
        >
          + New Invoice
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <input
          type="text"
          placeholder="Search invoices…"
          className="input flex-1"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="flex gap-2 flex-wrap">
          {(["all", "unpaid", "partial", "paid", "overdue", "refunded"] as FilterStatus[]).map(
            (status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={pillClass(filter === status)}
              >
                {status === "all" ? "All" : statusLabels[status as InvoiceStatus]}
              </button>
            )
          )}
        </div>
      </div>

      {/* Invoices List */}
      <div className="space-y-3">
        {filteredInvoices.length === 0 ? (
          <div className="card p-8 text-center text-gray-400">
            No invoices found.
          </div>
        ) : (
          filteredInvoices.map((inv) => (
            <button
              key={inv.id}
              onClick={() => navigate(`/invoices/${inv.id}`)}
              className="w-full card p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-left hover:bg-black/40 transition"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[#f5f3da] font-medium">
                    {inv.clientName || getClientName(inv.clientId)}
                  </span>
                  {inv.invoiceNumber && (
                    <span className="text-xs text-gray-500">
                      #{inv.invoiceNumber}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Created {formatDate(inv.createdAt)}
                  {inv.dueDate && ` • Due ${formatDate(inv.dueDate)}`}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-[#e8d487] font-semibold">
                    {formatCurrency(inv.total)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Paid: {formatCurrency(inv.amountPaid || 0)}
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 text-[10px] rounded-full border ${
                    statusStyles[inv.status]
                  }`}
                >
                  {statusLabels[inv.status]}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
