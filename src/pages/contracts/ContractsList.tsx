// -------------------------------------------------------------
// ContractsList.tsx — List all contracts
// -------------------------------------------------------------

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useContractsStore } from "@store/useContractsStore";
import { useClientsStore } from "@store/useClientsStore";
import type { ContractStatus } from "@db/index";

type FilterStatus = "all" | ContractStatus;

export default function ContractsList() {
  const navigate = useNavigate();
  const { contracts, loading, init } = useContractsStore();
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

  const filteredContracts = useMemo(() => {
    return contracts
      .filter((con) => {
        if (filter !== "all" && con.status !== filter) return false;
        if (search) {
          const q = search.toLowerCase();
          const clientName = con.clientName || getClientName(con.clientId);
          return (
            clientName.toLowerCase().includes(q) ||
            con.contractNumber?.toLowerCase().includes(q) ||
            con.title.toLowerCase().includes(q) ||
            con.id.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [contracts, filter, search, clients]);

  const formatDate = (ts: number | undefined) => {
    if (!ts) return "";
    return new Date(ts).toLocaleDateString();
  };

  const statusStyles: Record<ContractStatus, string> = {
    draft: "border-gray-500/60 text-gray-300",
    sent: "border-yellow-500/60 text-yellow-300",
    signed: "border-emerald-500/60 text-emerald-300",
    expired: "border-red-500/60 text-red-300",
    canceled: "border-red-500/60 text-red-300",
  };

  const statusLabels: Record<ContractStatus, string> = {
    draft: "Draft",
    sent: "Sent",
    signed: "Signed",
    expired: "Expired",
    canceled: "Canceled",
  };

  const pillClass = (active: boolean) =>
    `px-3 py-1 rounded-full border text-xs cursor-pointer transition ${
      active
        ? "border-[#e8d487] text-[#e8d487] bg-black/60"
        : "border-[#2a2414] text-gray-400 hover:border-[#e8d487]/60 hover:text-[#e8d487]"
    }`;

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-400">Loading contracts…</div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-[#e8d487]">
          <span className="border-l-2 border-[#e8d487] pl-2">Contracts</span>
        </h1>

        <button
          onClick={() => navigate("/contracts/new")}
          className="btn-outline-gold px-4 py-2"
        >
          + New Contract
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <input
          type="text"
          placeholder="Search contracts…"
          className="input flex-1"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="flex gap-2 flex-wrap">
          {(["all", "draft", "sent", "signed", "expired", "canceled"] as FilterStatus[]).map(
            (status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={pillClass(filter === status)}
              >
                {status === "all" ? "All" : statusLabels[status as ContractStatus]}
              </button>
            )
          )}
        </div>
      </div>

      {/* Contracts List */}
      <div className="space-y-3">
        {filteredContracts.length === 0 ? (
          <div className="card p-8 text-center text-gray-400">
            No contracts found.
          </div>
        ) : (
          filteredContracts.map((con) => (
            <button
              key={con.id}
              onClick={() => navigate(`/contracts/${con.id}`)}
              className="w-full card p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-left hover:bg-black/40 transition"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[#f5f3da] font-medium">{con.title}</span>
                  {con.contractNumber && (
                    <span className="text-xs text-gray-500">
                      #{con.contractNumber}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  {con.clientName || getClientName(con.clientId)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Created {formatDate(con.createdAt)}
                  {con.signedAt && ` • Signed ${formatDate(con.signedAt)}`}
                </div>
              </div>

              <div className="flex items-center gap-4">
                {con.signature && (
                  <span className="text-xs text-emerald-400">✓ Signed</span>
                )}
                <span
                  className={`px-2 py-0.5 text-[10px] rounded-full border ${
                    statusStyles[con.status]
                  }`}
                >
                  {statusLabels[con.status]}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
