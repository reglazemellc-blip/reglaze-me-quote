// -------------------------------------------------------------
// Dashboard.tsx  (UPGRADED FOR NEW APP STRUCTURE)
// -------------------------------------------------------------

import { useEffect, useMemo } from "react";
import { useClientsStore } from "@store/useClientsStore";
import { useQuotesStore } from "@store/useQuotesStore";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { clients, init: initClients } = useClientsStore();
  const { quotes, init: initQuotes } = useQuotesStore();
  const navigate = useNavigate();

  useEffect(() => {
    initClients();
    initQuotes();
  }, [initClients, initQuotes]);

  // -------------------------------------------------------------
  // SAFE FILTERS + SUPPORT FOR NEW FIELDS
  // -------------------------------------------------------------

  const statusCounts = useMemo(() => {
    const safe = quotes || [];

    return {
      pending: safe.filter((q) => q.status === "pending").length,
      approved: safe.filter((q) => q.status === "approved").length,
      scheduled: safe.filter((q) => q.status === "scheduled").length,
      in_progress: safe.filter((q) => q.status === "in_progress").length,
      completed: safe.filter((q) => q.status === "completed").length,
      canceled: safe.filter((q) => q.status === "canceled").length,
    };
  }, [quotes]);

  const totalClients = clients?.length ?? 0;
  const totalQuotes = quotes?.length ?? 0;

  // NEW: Quotes that were never sent
  const unsentQuotes = useMemo(
    () => quotes.filter((q) => !q.sentAt).length,
    [quotes]
  );

  // NEW: Quotes that expire within 7 days
  const expiringSoon = useMemo(() => {
    const now = Date.now();
    const in7 = now + 7 * 24 * 60 * 60 * 1000;

    return quotes.filter(
      (q) => q.expiresAt && q.expiresAt < in7 && q.expiresAt > now
    ).length;
  }, [quotes]);

  // NEW: Count reminders due today
  const remindersDue = useMemo(() => {
    const now = Date.now();
    return clients.reduce((count, c) => {
      const rs = c.reminders ?? [];
      return (
        count +
        rs.filter((r) => !r.done && r.remindAt <= now).length
      );
    }, 0);
  }, [clients]);

  // -------------------------------------------------------------
  // STYLES
  // -------------------------------------------------------------
  const boxClasses =
    "flex flex-col justify-center items-center p-4 rounded-xl bg-black/30 border border-[#2a2414] hover:bg-black/50 cursor-pointer transition";

  const labelClasses = "text-xs text-gray-400 tracking-wide";
  const numberClasses = "text-2xl font-semibold text-[#e8d487]";

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* HEADER */}
      <h2 className="text-xl font-semibold text-[#e8d487] mb-2">
        Overview
      </h2>

      {/* STATUS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* STATUS BOXES */}
        <div
          className={boxClasses}
          onClick={() => navigate("/quotes?status=pending")}
        >
          <div className={labelClasses}>PENDING</div>
          <div className={numberClasses}>{statusCounts.pending}</div>
        </div>

        <div
          className={boxClasses}
          onClick={() => navigate("/quotes?status=approved")}
        >
          <div className={labelClasses}>APPROVED</div>
          <div className={numberClasses}>{statusCounts.approved}</div>
        </div>

        <div
          className={boxClasses}
          onClick={() => navigate("/quotes?status=scheduled")}
        >
          <div className={labelClasses}>SCHEDULED</div>
          <div className={numberClasses}>{statusCounts.scheduled}</div>
        </div>

        <div
          className={boxClasses}
          onClick={() => navigate("/quotes?status=in_progress")}
        >
          <div className={labelClasses}>IN PROGRESS</div>
          <div className={numberClasses}>
            {statusCounts.in_progress}
          </div>
        </div>

        <div
          className={boxClasses}
          onClick={() => navigate("/quotes?status=completed")}
        >
          <div className={labelClasses}>COMPLETED</div>
          <div className={numberClasses}>{statusCounts.completed}</div>
        </div>

        <div
          className={boxClasses}
          onClick={() => navigate("/quotes?status=canceled")}
        >
          <div className={labelClasses}>CANCELED</div>
          <div className={numberClasses}>{statusCounts.canceled}</div>
        </div>

        {/* CLIENTS BOX */}
        <div className={boxClasses} onClick={() => navigate("/clients")}>
          <div className={labelClasses}>CLIENTS</div>
          <div className={numberClasses}>{totalClients}</div>
        </div>

        {/* QUOTES BOX */}
        <div className={boxClasses} onClick={() => navigate("/quotes")}>
          <div className={labelClasses}>QUOTES</div>
          <div className={numberClasses}>{totalQuotes}</div>
        </div>

        {/* UNSENT QUOTES */}
        <div
          className={boxClasses}
          onClick={() => navigate("/quotes?filter=unsent")}
        >
          <div className={labelClasses}>UNSENT</div>
          <div className={numberClasses}>{unsentQuotes}</div>
        </div>

        {/* EXPIRING SOON */}
        <div
          className={boxClasses}
          onClick={() => navigate("/quotes?filter=expiring")}
        >
          <div className={labelClasses}>EXPIRING 7 DAYS</div>
          <div className={numberClasses}>{expiringSoon}</div>
        </div>

        {/* REMINDERS DUE */}
        <div
          className={boxClasses}
          onClick={() => navigate("/reminders")}
        >
          <div className={labelClasses}>REMINDERS DUE</div>
          <div className={numberClasses}>{remindersDue}</div>
        </div>
      </div>

      {/* QUICK LINKS */}
      <div className="flex gap-4 pt-4">
        <button
          onClick={() => navigate("/quotes")}
          className="btn-outline-gold px-4 py-2"
        >
          View All Quotes
        </button>

        <button
          onClick={() => navigate("/clients")}
          className="btn-outline-gold px-4 py-2"
        >
          View All Clients
        </button>
      </div>
    </div>
  );
}
