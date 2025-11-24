// -------------------------------------------------------------
// Clients.tsx — FIXED
// -------------------------------------------------------------

import { useClientsStore } from "@store/useClientsStore";
import { useQuotesStore } from "@store/useQuotesStore";
import { useEffect, useMemo, useState } from "react";
import SearchBar from "@components/SearchBar";
import { Link, useNavigate } from "react-router-dom";

export default function Clients() {
  const { clients, init, remove } = useClientsStore();
  const { quotes } = useQuotesStore();

  const [term, setTerm] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const navigate = useNavigate();

  useEffect(() => {
    init();
  }, [init]);

  // ---------------- FILTER + SORT ----------------
  const filtered = useMemo(() => {
    const arr = [...clients];

    // basic search
    const q = term.trim().toLowerCase();
    const searched = !q
      ? arr
      : arr.filter((c) =>
          [c.name, c.phone, c.email, c.address]
            .filter(Boolean)
            .some((v) => v!.toLowerCase().includes(q))
        );

    // sort by name
    return searched.sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, term]);

  // ---------------- SELECTION LOGIC ----------------
  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selected.length === filtered.length) {
      setSelected([]);
    } else {
      setSelected(filtered.map((c) => c.id));
    }
  };

  const clearSelection = () => setSelected([]);

  const deleteSelected = async () => {
    if (!selected.length) return;

    const totalQuotes = quotes.filter((q) =>
      selected.includes(q.clientId)
    ).length;

    const msg =
      totalQuotes > 0
        ? `Delete ${selected.length} clients AND ${totalQuotes} associated quote(s)?`
        : `Delete ${selected.length} clients?`;

    if (!confirm(msg)) return;

    for (const id of selected) {
      await remove(id);
    }

    clearSelection();
  };

  // ---------------- HELPERS ----------------
  const quoteCountFor = (clientId: string) =>
    quotes.filter((q) => q.clientId === clientId).length;

  const shortAddress = (addr?: string | null) => {
    if (!addr) return "";
    const line = String(addr).split("\n")[0];
    return line.length > 40 ? line.slice(0, 37) + "…" : line;
  };

  // ---------------- RENDER ----------------
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#e8d487]">
            Clients
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Search, sort, and manage all your clients.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex-1 md:flex-none min-w-[220px]">
            <SearchBar
              placeholder="Search by name, phone, email, address"
              onChange={setTerm}
            />
          </div>

          <button
            className="btn-gold"
            onClick={() => navigate("/clients/new")}
          >
            Add Client
          </button>
        </div>
      </div>

      {/* BULK BAR */}
      {filtered.length > 0 && (
        <div className="flex justify-between items-center py-2 px-3 bg-black/40 rounded-xl border border-[#2a2a2a] text-xs">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={
                selected.length > 0 &&
                selected.length === filtered.length
              }
              onChange={toggleAll}
            />
            <span className="text-gray-300">
              {selected.length > 0
                ? `${selected.length} selected`
                : "Select All"}
            </span>
          </div>

          {selected.length > 0 && (
            <button
              className="text-red-500 underline"
              onClick={deleteSelected}
            >
              Delete Selected
            </button>
          )}
        </div>
      )}

      {/* TABLE STYLE LIST */}
      <div className="card p-0 overflow-hidden">
        <div className="grid grid-cols-[20px,2fr,2fr,2fr,80px] px-4 py-2 text-[11px] uppercase tracking-wide text-gray-500 border-b border-[#2a2a2a]">
          <div />
          <div>Name</div>
          <div>Contact</div>
          <div>Address</div>
          <div className="text-right">Quotes</div>
        </div>

        {filtered.map((c) => {
          const count = quoteCountFor(c.id);

          return (
            <div
              key={c.id}
              className="grid grid-cols-[20px,2fr,2fr,2fr,80px] px-4 py-3 text-xs border-b border-[#151515] hover:bg-white/5 transition"
            >
              {/* checkbox */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selected.includes(c.id)}
                  onChange={() => toggle(c.id)}
                />
              </div>

              {/* name + open detail */}
              <div className="flex flex-col justify-center">
                <Link
                  to={`/clients/${c.id}`}
                  className="font-medium text-[#f5f3da] hover:text-[#e8d487]"
                >
                  {c.name || "(no name)"}
                </Link>
                {c.notes && (
                  <div className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">
                    {c.notes}
                  </div>
                )}
              </div>

              {/* contact */}
              <div className="flex flex-col justify-center text-gray-300">
                {c.phone && (
                  <div className="text-[11px]">{c.phone}</div>
                )}
                {c.email && (
                  <div className="text-[11px] text-gray-400 line-clamp-1">
                    {c.email}
                  </div>
                )}
              </div>

              {/* address */}
              <div className="flex items-center text-gray-300">
                <span className="text-[11px]">
                  {shortAddress(c.address)}
                </span>
              </div>

              {/* quote count + delete */}
              <div className="flex items-center justify-end gap-3">
                <span className="text-[11px] text-gray-400">
                  {count} q
                </span>
                <button
                  className="text-red-500 hover:text-red-400 text-[11px]"
                  onClick={async () => {
                    const msg =
                      count > 0
                        ? `Delete this client AND ${count} quote(s)?`
                        : "Delete this client?";

                    if (confirm(msg)) {
                      await remove(c.id);
                    }
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="py-6 text-center text-sm text-gray-500">
            No clients found.
          </div>
        )}
      </div>
    </div>
  );
}
