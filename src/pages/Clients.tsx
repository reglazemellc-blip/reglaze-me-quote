// -------------------------------------------------------------
// Clients.tsx — Full Rewrite (Gold Dropdown + Sorting + Clean Cards)
// -------------------------------------------------------------

import { useClientsStore } from "@store/useClientsStore";
import { useQuotesStore } from "@store/useQuotesStore";
import { useConfigStore } from "@store/useConfigStore";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";


import SearchBar from "@components/SearchBar";
import ClientDrawer from "@components/ClientDrawer";
import { ChevronDown } from "lucide-react";

// -------------------------------------------------------------
// Sorting Options
// -------------------------------------------------------------
type SortMode =
  | "newest"          // most recently created
  | "oldest"          // oldest created
  | "name_az"         // alphabetical
  | "name_za"         // reverse
  | "recent_activity" // last quote OR last conversation
  | "quote_count";    // most quotes at top

export default function Clients() {
  const { clients, init } = useClientsStore();
  const { quotes } = useQuotesStore();
  const { config } = useConfigStore();
  


  const labels = config?.labels;

  const [term, setTerm] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("recent_activity");

  const [clientQuotes, setClientQuotes] = useState<any[]>([]);
  const [clientInvoices, setClientInvoices] = useState<any[]>([]);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
  contacted: true,
})

const toggleStatus = (status: string) => {
  setCollapsed((prev) => ({
    ...prev,
    [status]: !prev[status],
  }))
}

  const navigate = useNavigate(); 
  const location = useLocation();

  // -------------------------------------------------------------
// Load Clients on Mount
// -------------------------------------------------------------
useEffect(() => {
  init();

  async function loadFinancials() {
    const tenantId = useConfigStore.getState().activeTenantId;
    if (!tenantId) return;

    const qSnap = await getDocs(
      query(
        collection(db, "quotes"),
        where("tenantId", "==", tenantId)
      )
    );

    const iSnap = await getDocs(
      query(
        collection(db, "invoices"),
        where("tenantId", "==", tenantId)
      )
    );

    setClientQuotes(
      qSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }))
    );

    setClientInvoices(
      iSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }))
    );
  }

  loadFinancials();
}, [init]);


   // -------------------------------------------------------------
  // Auto-open Drawer if coming from Dashboard
  // -------------------------------------------------------------
  useEffect(() => {
    const state = location.state as { openClientDrawer?: boolean } | null;
    if (state?.openClientDrawer) {
      setDrawerOpen(true);
      navigate("/clients", { replace: true });
    }
  }, [location.state, navigate]);

    // -------------------------------------------------------------
  // Load client financials (quotes + invoices) — READ ONLY
  // -------------------------------------------------------------
  useEffect(() => {
    async function loadClientFinancials() {
      const tenantId = useConfigStore.getState().activeTenantId;
      if (!tenantId) return;

      try {
        const qSnap = await getDocs(
          query(
            collection(db, "quotes"),
            where("tenantId", "==", tenantId)
          )
        );

        setClientQuotes(
          qSnap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          }))
        );

        const iSnap = await getDocs(
          query(
            collection(db, "invoices"),
            where("tenantId", "==", tenantId)
          )
        );

        setClientInvoices(
          iSnap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          }))
        );
      } catch (err) {
        console.error("Failed to load client financials", err);
      }
    }

    loadClientFinancials();
  }, []);



  // -------------------------------------------------------------
  // Helper: Format Address
  // -------------------------------------------------------------
  const formatAddress = (c: any) => {
    if (c.address) return c.address;
    const parts = [c.street, c.city, c.state, c.zip].filter(Boolean);
    return parts.join("\n");
  };

  // -------------------------------------------------------------
  // Quote Count per Client
  // -------------------------------------------------------------
  const quoteCount = (clientId: string) =>
    clientQuotes.filter((q) => q.clientId === clientId).length;


  // -------------------------------------------------------------
  // Compute last activity (quote or conversation)
  // -------------------------------------------------------------
  const lastActivity = (c: any) => {
    const lastQuote = clientQuotes
      .filter((q) => q.clientId === c.id)
      .sort((a, b) => (b.updatedAt ?? b.createdAt ?? 0) - (a.updatedAt ?? a.createdAt ?? 0))[0];

    const lastConv = (c.conversations ?? []).sort(
      (a: any, b: any) => b.createdAt - a.createdAt
    )[0];

    const quoteTime = lastQuote ? (lastQuote.updatedAt ?? lastQuote.createdAt ?? 0) : 0;
    const convTime = lastConv ? lastConv.createdAt : 0;

    return Math.max(quoteTime, convTime, c.createdAt ?? 0);
  };

  // -------------------------------------------------------------
  // Search Filter
  // -------------------------------------------------------------
  const filtered = useMemo(() => {
    if (!term.trim()) return [...clients];

    const q = term.toLowerCase().trim();

    return clients.filter((c) =>
      [c.name, c.phone, c.email, c.address]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [clients, term]);

  // -------------------------------------------------------------
  // Sorting Logic
  // -------------------------------------------------------------
  const sorted = useMemo(() => {
    const arr = [...filtered];
     



    switch (sortMode) {
      case "newest":
        return arr.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

      case "oldest":
        return arr.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));

      case "name_az":
        return arr.sort((a, b) => a.name.localeCompare(b.name));

      case "name_za":
        return arr.sort((a, b) => b.name.localeCompare(a.name));

      case "quote_count":
        return arr.sort((a, b) => quoteCount(b.id) - quoteCount(a.id));

      case "recent_activity":
      default:
        return arr.sort((a, b) => lastActivity(b) - lastActivity(a));
    }
  }, [filtered, sortMode, quotes]);
   const groupedByStatus = useMemo(() => {
  return sorted.reduce<Record<string, typeof sorted>>((acc, client) => {
    const status = client.status ?? "new"
    if (!acc[status]) acc[status] = []
    acc[status].push(client)
    return acc
  }, {})
}, [sorted])

  // -------------------------------------------------------------
  // UI
  // -------------------------------------------------------------
  return (
    <>
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">

        {/* HEADER ------------------------------------------------ */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

          <div>
            <h2 className="text-xl font-semibold text-[#e8d487]">{labels?.clientsTitle || 'Clients'}</h2>
            <p className="text-xs text-gray-500">Manage your customer list.</p>
          </div>

          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            {/* SEARCH BAR */}
            <SearchBar
              placeholder={labels?.clientsSearchPlaceholder || 'Search clients...'}
              value={term}
              onChange={setTerm}
            />

            {/* ACTIONS */}
            <button
              className="btn-gold whitespace-nowrap"
              onClick={() => setDrawerOpen(true)}
            >
              + {labels?.clientNewButton || 'New Client'}
            </button>
          </div>
        </div>

        {/* SORT DROPDOWN ----------------------------------------- */}
        <div className="flex justify-end">
          <div className="relative">
            <button
              className="
                flex items-center gap-2 
                px-3 py-2 text-sm 
                border border-[#e8d487]/40 
                rounded-lg text-[#e8d487]
                bg-black/30 hover:bg-black/50
              "
              onClick={() => {
                const menu = document.getElementById("sortMenu");
                if (menu) menu.classList.toggle("hidden");
              }}
            >
              Sort: {sortMode.replace("_", " ")}
              <ChevronDown size={16} />
            </button>

            {/* DROPDOWN */}
            <div
              id="sortMenu"
              className="
                hidden absolute right-0 mt-2 w-48 
                bg-[#111] border border-[#2a2a2a] 
                rounded-lg shadow-lg z-50
              "
            >
              {([
                ["recent_activity", "Recent activity"],
                ["newest", "Newest created"],
                ["oldest", "Oldest created"],
                ["name_az", "Name A–Z"],
                ["name_za", "Name Z–A"],
                ["quote_count", "Most quotes"],
              ] as [SortMode, string][]).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => {
                    setSortMode(value);
                    const menu = document.getElementById("sortMenu");
                    if (menu) menu.classList.add("hidden");
                  }}
                  className="
                    w-full text-left px-4 py-2 text-sm 
                    hover:bg-black/40 text-gray-300
                  "
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CLIENT LIST ------------------------------------------- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(groupedByStatus).map(([status, clients]) => (
  <div key={status} className="col-span-full space-y-4 mt-6 pt-4 border-t border-[#2a2414]">

    <button
  type="button"
  onClick={() => toggleStatus(status)}
  className="flex items-center justify-between w-full px-3 py-2 rounded-md bg-black/30 border border-[#2a2414] text-sm font-semibold uppercase tracking-wide text-[#e8d487] hover:bg-black/50"

>
   <span>
    {status} ({clients.length})
  </span>

  <span className="ml-3 text-lg font-bold" style={{ color: "#e8d487" }}>


    {collapsed[status] ? "▸" : "▾"}

  </span>
</button>


    {!collapsed[status] && (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {clients.map((c) => (

        <Link
          key={c.id}
          to={`/clients/${c.id}`}
          className="block bg-black/40 border border-[#2a2414] rounded-xl p-4 hover:bg-black/60 transition shadow"
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              {/* Name */}
              <div className="text-lg font-semibold text-[#f5f3da]">
                {c.name}
              </div>

              {/* Contact Info: Phone, Address, Email */}
              <div className="mt-2 text-[13px] space-y-0.5">
                {c.phone && <div className="text-gray-300">{c.phone}</div>}
                {c.address && (
                  <div className="whitespace-pre-line text-gray-300">
                    {c.address}
                  </div>
                )}
                {c.email && <div className="text-gray-400">{c.email}</div>}
              </div>

              {/* Quote Summary - Clean compact display */}
              {(() => {
                const quotes = clientQuotes.filter((q) => q.clientId === c.id);
                if (quotes.length === 0) return null;
                
                const finishedStatuses = ['completed', 'invoiced', 'paid'];
                const activeQuotes = quotes.filter((q: any) => !finishedStatuses.includes(q.workflowStatus || 'new'));
                const completedQuotes = quotes.filter((q: any) => finishedStatuses.includes(q.workflowStatus || 'new'));
                
                return (
                  <div className="mt-2 flex items-center gap-2 text-[11px]">
                    {activeQuotes.length > 0 && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#e8d487]/20 text-[#e8d487] border border-[#e8d487]/30">
                        <span className="w-1.5 h-1.5 bg-[#e8d487] rounded-full animate-pulse"></span>
                        {activeQuotes.length} active
                      </span>
                    )}
                    {completedQuotes.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-green-900/30 text-green-400 border border-green-700/30">
                        {completedQuotes.length} done
                      </span>
                    )}
                    <span className="text-gray-500">
                      {quotes.length} total
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>
        </Link>
         ))}
  </div>
)}

  </div>
))}

        </div>
      </div>

      {/* DRAWER ------------------------------------------------ */}
      <ClientDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCreated={(client) => {
          setDrawerOpen(false);
          navigate(`/clients/${client.id}`);
        }}
      />
    </>
  );
}
