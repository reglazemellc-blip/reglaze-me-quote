// -------------------------------------------------------------
// Clients.tsx — CLEAN MODERN CARDS LAYOUT
// -------------------------------------------------------------

import { useClientsStore } from "@store/useClientsStore";
import { useQuotesStore } from "@store/useQuotesStore";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SearchBar from "@components/SearchBar";

export default function Clients() {
  const { clients, init } = useClientsStore();
  const { quotes } = useQuotesStore();

  const [term, setTerm] = useState("");
  const navigate = useNavigate();

  // Load clients on mount
  useEffect(() => {
    init();
  }, [init]);

  // Filter logic
  const filtered = useMemo(() => {
    if (!term.trim()) return [...clients];

    const q = term.toLowerCase().trim();

    return clients.filter((c) =>
      [c.name, c.phone, c.email, c.address]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q))
    );
  }, [clients, term]);

  // Count quotes per client
  const quoteCount = (clientId: string) =>
    quotes.filter((q) => q.clientId === clientId).length;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#e8d487]">Clients</h2>
          <p className="text-xs text-gray-500">Manage your customer list.</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex-1 md:flex-none">
            <SearchBar
              placeholder="Search by name, phone, email, address"
              onChange={setTerm}
            />
          </div>

          <button
            className="btn-gold"
            onClick={() => navigate("/clients/new")}
          >
            + Add Client
          </button>
        </div>
      </div>

      {/* CLIENT GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((c) => (
          <Link
            key={c.id}
            to={`/clients/${c.id}`}
            className="
              block 
              bg-black/40 
              border border-[#2a2414]
              rounded-xl
              p-4
              hover:bg-black/60 
              transition 
              shadow
            "
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="text-lg font-semibold text-[#f5f3da]">
                  {c.name}
                </div>

                <div className="mt-2 text-[13px] space-y-0.5 text-gray-300">
                  {c.phone && <div>{c.phone}</div>}
                  {c.email && <div>{c.email}</div>}
                  {c.address && (
                    <div className="whitespace-pre-line text-gray-400">
                      {c.address}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right">
                <span
                  className="
                    text-[11px]
                    px-2 py-1
                    rounded-full 
                    border border-[#e8d487]/70 
                    text-[#e8d487]
                  "
                >
                  {quoteCount(c.id)} quotes
                </span>
              </div>
            </div>
          </Link>
        ))}

        {!filtered.length && (
          <div className="col-span-full text-center text-gray-500 py-10">
            No clients found.
          </div>
        )}
      </div>
    </div>
  );
}
