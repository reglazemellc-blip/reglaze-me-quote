// -------------------------------------------------------------
// Companies.tsx — Property Management Companies List
// -------------------------------------------------------------

import { useCompaniesStore } from "@store/useCompaniesStore";
import { useConfigStore } from "@store/useConfigStore";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SearchBar from "@components/SearchBar";
import { ChevronDown, Building2, MapPin } from "lucide-react";

// -------------------------------------------------------------
// Sorting Options
// -------------------------------------------------------------
type SortMode =
  | "newest"
  | "oldest"
  | "name_az"
  | "name_za"
  | "property_count";

export default function Companies() {
  const { companies, properties, init, loading } = useCompaniesStore();
  const { config } = useConfigStore();

  const [term, setTerm] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  const navigate = useNavigate();

  // -------------------------------------------------------------
  // Load Companies on Mount
  // -------------------------------------------------------------
  useEffect(() => {
    init();
  }, [init]);

  // -------------------------------------------------------------
  // Property Count per Company
  // -------------------------------------------------------------
  const propertyCount = (companyId: string) =>
    properties.filter((p) => p.companyId === companyId).length;

  // -------------------------------------------------------------
  // Get workflow status summary for a company
  // -------------------------------------------------------------
  const getStatusSummary = (companyId: string) => {
    const companyProperties = properties.filter((p) => p.companyId === companyId);
    const statusCounts: Record<string, number> = {};

    companyProperties.forEach((p) => {
      const status = p.workflowStatus || "new";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    return statusCounts;
  };

  // -------------------------------------------------------------
  // Search Filter
  // -------------------------------------------------------------
  const filtered = useMemo(() => {
    if (!term.trim()) return [...companies];

    const q = term.toLowerCase().trim();

    return companies.filter((c) =>
      [c.name, c.contactName, c.phone, c.email]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [companies, term]);

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

      case "property_count":
        return arr.sort((a, b) => propertyCount(b.id) - propertyCount(a.id));

      default:
        return arr;
    }
  }, [filtered, sortMode, properties]);

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <div className="text-gray-400">Loading companies...</div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // UI
  // -------------------------------------------------------------
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* HEADER ------------------------------------------------ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#e8d487]">Property Management Companies</h2>
          <p className="text-xs text-gray-500">Manage apartment buildings and property managers.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          {/* SEARCH BAR */}
          <SearchBar
            placeholder="Search companies..."
            value={term}
            onChange={setTerm}
          />

          {/* NEW COMPANY BUTTON */}
          <button
            className="btn-gold whitespace-nowrap"
            onClick={() => navigate("/companies/new")}
          >
            + New Company
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
              const menu = document.getElementById("companySortMenu");
              if (menu) menu.classList.toggle("hidden");
            }}
          >
            Sort: {sortMode.replace("_", " ")}
            <ChevronDown size={16} />
          </button>

          {/* DROPDOWN */}
          <div
            id="companySortMenu"
            className="
              hidden absolute right-0 mt-2 w-48
              bg-[#111] border border-[#2a2a2a]
              rounded-lg shadow-lg z-50
            "
          >
            {([
              ["newest", "Newest created"],
              ["oldest", "Oldest created"],
              ["name_az", "Name A–Z"],
              ["name_za", "Name Z–A"],
              ["property_count", "Most properties"],
            ] as [SortMode, string][]).map(([value, label]) => (
              <button
                key={value}
                onClick={() => {
                  setSortMode(value);
                  const menu = document.getElementById("companySortMenu");
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

      {/* COMPANIES LIST ---------------------------------------- */}
      {sorted.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No companies yet.</p>
          <p className="text-sm mt-2">Add a property management company to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sorted.map((c) => {
            const propCount = propertyCount(c.id);
            const statusSummary = getStatusSummary(c.id);
            const scheduledCount = statusSummary["scheduled"] || 0;
            const completedCount = statusSummary["completed"] || 0;
            const invoicedCount = statusSummary["invoiced"] || 0;

            return (
              <Link
                key={c.id}
                to={`/companies/${c.id}`}
                className="block bg-black/40 border border-[#2a2414] rounded-xl p-4 hover:bg-black/60 transition shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-[#e8d487]" />
                      <div className="text-lg font-semibold text-[#f5f3da]">
                        {c.name}
                      </div>
                    </div>

                    {c.contactName && (
                      <div className="mt-1 text-sm text-gray-400">
                        Contact: {c.contactName}
                      </div>
                    )}

                    <div className="mt-2 text-[13px] space-y-0.5 text-gray-300">
                      {c.phone && <div>{c.phone}</div>}
                      {c.email && <div>{c.email}</div>}
                    </div>

                    {/* Status Summary */}
                    {propCount > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                        {scheduledCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-900/50 text-blue-300 border border-blue-700/50">
                            {scheduledCount} scheduled
                          </span>
                        )}
                        {completedCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-green-900/50 text-green-300 border border-green-700/50">
                            {completedCount} completed
                          </span>
                        )}
                        {invoicedCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-purple-900/50 text-purple-300 border border-purple-700/50">
                            {invoicedCount} invoiced
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className="text-[11px] px-2 py-1 rounded-full border border-[#e8d487]/70 text-[#e8d487] whitespace-nowrap flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {propCount} {propCount === 1 ? "unit" : "units"}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
