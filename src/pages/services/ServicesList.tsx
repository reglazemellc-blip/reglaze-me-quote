// -------------------------------------------------------------
// ServicesList.tsx — Service Library List Screen
// -------------------------------------------------------------

import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useServicesStore } from "@store/useServicesStore";

export default function ServicesList() {
  const { services, loading, init, remove } = useServicesStore();

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="p-4 md:p-6 space-y-6 text-[#f5f3da]">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-[#e8d487]">
          Services
        </h1>

        <Link to="/services/new" className="btn-gold">
          + New Service
        </Link>
      </div>

      {/* LOADING */}
      {loading && <div className="text-gray-400">Loading services...</div>}

      {/* EMPTY */}
      {!loading && services.length === 0 && (
        <div className="text-gray-400">No services added yet.</div>
      )}

      {/* SERVICE LIST */}
      <div className="space-y-3">
        {services.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between p-4 rounded-xl bg-black/20 hover:bg-black/40 transition-all border border-[#2a2414]"
          >
            {/* LEFT SIDE */}
            <div className="flex-1">
              <p className="font-semibold text-[#f5f3da]">
                {s.name}
              </p>

              {s.description && (
                <p className="text-xs text-gray-400">
                  {s.description}
                </p>
              )}

              <p className="text-sm text-[#e8d487] mt-1">
                ${s.unitPrice.toFixed(2)}
              </p>

              {s.category && (
                <p className="text-[10px] text-gray-500 mt-1">
                  Category: {s.category}
                </p>
              )}
            </div>

            {/* ACTIONS */}
            <div className="flex items-center gap-3">

              {/* EDIT */}
              <Link
                to={`/services/${s.id}/edit`}
                className="text-sm underline text-[#e8d487] hover:text-yellow-300"
              >
                Edit
              </Link>

              {/* DELETE */}
              <button
                className="text-red-500 text-sm hover:text-red-400"
                onClick={async () => {
                  if (confirm(`Delete service "${s.name}"?`)) {
                    await remove(s.id);
                  }
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
