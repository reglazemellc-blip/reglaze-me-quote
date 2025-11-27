// -------------------------------------------------------------
// Dashboard.tsx — PREMIUM DASHBOARD + ACTIONS + FILTERS
// -------------------------------------------------------------

import { useEffect, useMemo, useState } from "react";
import { useClientsStore } from "@store/useClientsStore";
import { useQuotesStore } from "@store/useQuotesStore";
import { useConfigStore } from "@store/useConfigStore";
import { useNavigate } from "react-router-dom";

// -------------------------------------------------------------
// SMALL INLINE ICONS (no external libraries)
// -------------------------------------------------------------
type IconProps = { className?: string };

const DocumentIcon = ({ className = "" }: IconProps) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M7 3h7l5 5v13H7z" />
    <path d="M14 3v5h5" />
  </svg>
);

const ClockIcon = ({ className = "" }: IconProps) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

const CalendarIcon = ({ className = "" }: IconProps) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <path d="M8 2v4M16 2v4M3 10h18" />
  </svg>
);

const UsersIcon = ({ className = "" }: IconProps) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="9" cy="8" r="3" />
    <path d="M4 18c0-2.2 2.2-4 5-4" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M15 18c0-1.8 1.7-3.3 4-3.5" />
  </svg>
);

const MailIcon = ({ className = "" }: IconProps) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M4 7.5 12 12l8-4.5" />
  </svg>
);

const AlertIcon = ({ className = "" }: IconProps) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3 3 19h18z" />
    <path d="M12 9v5" />
    <circle cx="12" cy="16.5" r="0.5" />
  </svg>
);

const BellIcon = ({ className = "" }: IconProps) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 16v-4a6 6 0 0 0-12 0v4" />
    <path d="M5 16h14" />
    <path d="M10 19a2 2 0 0 0 4 0" />
  </svg>
);

// -------------------------------------------------------------
// TYPES
// -------------------------------------------------------------
type ActionItem = {
  label: string;
  count: number;
  description?: string;
  onClick: () => void;
};

type RecentFilter = "all" | "pending" | "scheduled" | "unsent";

// -------------------------------------------------------------
// COMPONENT
// -------------------------------------------------------------
export default function Dashboard() {
  const { clients, init: initClients } = useClientsStore();
  const { quotes, init: initQuotes } = useQuotesStore();
  const { config } = useConfigStore();
  const navigate = useNavigate();

  const labels = config?.labels;

  // -------------------------------------------------------------
  // INIT STORE DATA
  // -------------------------------------------------------------
  useEffect(() => {
    initClients();
    initQuotes();
  }, [initClients, initQuotes]);

  const safeQuotes = quotes || [];
  const safeClients = clients || [];

  // -------------------------------------------------------------
  // KEY METRIC CALCULATIONS
  // -------------------------------------------------------------
  const totalQuotes = safeQuotes.length;
  const totalClients = safeClients.length;

  const pending = safeQuotes.filter((q) => q.status === "pending").length;
  const scheduled = safeQuotes.filter((q) => q.status === "scheduled").length;

  const unsent = safeQuotes.filter((q) => !q.sentAt).length;

  const expiringSoon = useMemo(() => {
    const now = Date.now();
    const in7 = now + 7 * 24 * 60 * 60 * 1000;
    return safeQuotes.filter(
      (q) => q.expiresAt && q.expiresAt < in7 && q.expiresAt > now
    ).length;
  }, [safeQuotes]);

  const remindersDue = useMemo(() => {
    const now = Date.now();
    return safeClients.reduce((count, c) => {
      const rs = c.reminders ?? [];
      return count + rs.filter((r) => !r.done && r.remindAt <= now).length;
    }, 0);
  }, [safeClients]);

  // -------------------------------------------------------------
  // LIST DATA: RECENT + SCHEDULED
  // -------------------------------------------------------------
  const recentQuotes = useMemo(
    () =>
      [...safeQuotes]
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
        .slice(0, 5),
    [safeQuotes]
  );

  const scheduledQuotes = useMemo(
    () =>
      safeQuotes
        .filter((q) => q.status === "scheduled")
        .sort((a, b) => (a.updatedAt ?? 0) - (b.updatedAt ?? 0))
        .slice(0, 5),
    [safeQuotes]
  );

  // Quick filter for Recent
  const [recentFilter, setRecentFilter] = useState<RecentFilter>("all");

  const filteredRecentQuotes = useMemo(() => {
    return recentQuotes.filter((q) => {
      switch (recentFilter) {
        case "pending":
          return q.status === "pending";
        case "scheduled":
          return q.status === "scheduled";
        case "unsent":
          return !q.sentAt;
        case "all":
        default:
          return true;
      }
    });
  }, [recentQuotes, recentFilter]);

  // -------------------------------------------------------------
  // HELPERS
  // -------------------------------------------------------------
  const formatCurrency = (value: number | undefined | null) => {
    const n = typeof value === "number" ? value : 0;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(n);
  };

  const formatDate = (ts: number | undefined | null) => {
    if (!ts) return "";
    return new Date(ts).toLocaleDateString();
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Pending";
      case "approved":
        return "Approved";
      case "scheduled":
        return "Scheduled";
      case "in_progress":
        return "In Progress";
      case "completed":
        return "Completed";
      case "canceled":
        return "Canceled";
      default:
        return status || "Unknown";
    }
  };

  const statusClass = (status: string) => {
    let base = "px-2 py-0.5 text-[10px] rounded-full border ";
    switch (status) {
      case "pending":
        return base + "border-yellow-500/60 text-yellow-300";
      case "approved":
        return base + "border-emerald-500/60 text-emerald-300";
      case "scheduled":
        return base + "border-sky-500/60 text-sky-300";
      case "in_progress":
        return base + "border-blue-500/60 text-blue-300";
      case "completed":
        return base + "border-gray-500/60 text-gray-300";
      case "canceled":
        return base + "border-red-500/60 text-red-300";
      default:
        return base + "border-gray-500/60 text-gray-300";
    }
  };

  const displayQuoteNumber = (q: { id?: string; quoteNumber?: string | null }) => {
    if (q.quoteNumber) return q.quoteNumber;
    const id = q.id || "";
    if (!id) return "";
    if (id.length <= 10) return id;
    return `${id.slice(0, 6)}…${id.slice(-4)}`;
  };

  const pillClasses = (value: RecentFilter) =>
    `px-2 py-0.5 rounded-full border text-[10px] cursor-pointer transition ${
      recentFilter === value
        ? "border-[#e8d487] text-[#e8d487] bg-black/60"
        : "border-[#2a2414] text-gray-400 hover:border-[#e8d487]/60 hover:text-[#e8d487]"
    }`;

  // -------------------------------------------------------------
  // TODAY'S ACTIONS
  // -------------------------------------------------------------
  const todaysActions: ActionItem[] = useMemo(() => {
    const now = new Date();
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime();
    const end = start + 24 * 60 * 60 * 1000;

    const scheduledTodayCount = safeQuotes.filter(
      (q) =>
        q.status === "scheduled" &&
        q.updatedAt &&
        q.updatedAt >= start &&
        q.updatedAt < end
    ).length;

    const items: ActionItem[] = [];

    if (pending > 0) {
      items.push({
        label: "Pending quotes",
        count: pending,
        description: "Quotes waiting for approval or scheduling.",
        onClick: () => navigate("/quotes?status=pending"),
      });
    }

    if (unsent > 0) {
      items.push({
        label: "Unsent quotes",
        count: unsent,
        description: "Quotes drafted but not sent to clients.",
        onClick: () => navigate("/quotes?filter=unsent"),
      });
    }

    if (scheduledTodayCount > 0) {
      items.push({
        label: "Jobs scheduled today",
        count: scheduledTodayCount,
        description: "Work scheduled to happen today.",
        onClick: () => navigate("/quotes?status=scheduled"),
      });
    }

    if (expiringSoon > 0) {
      items.push({
        label: "Quotes expiring soon",
        count: expiringSoon,
        description: "Quotes expiring in the next 7 days.",
        onClick: () => navigate("/quotes?filter=expiring"),
      });
    }

    if (remindersDue > 0) {
      items.push({
        label: "Reminders due",
        count: remindersDue,
        description: "Follow-ups you scheduled with clients.",
        onClick: () => navigate("/reminders"),
      });
    }

    return items;
  }, [safeQuotes, pending, unsent, expiringSoon, remindersDue, navigate]);

  // -------------------------------------------------------------
  // UI STYLES
  // -------------------------------------------------------------
  const box =
    "flex flex-col items-center justify-center rounded-xl p-4 md:p-5 bg-black/30 border border-[#2a2414] hover:bg-black/50 transition transform hover:-translate-y-0.5 hover:shadow-lg cursor-pointer";

  const label = "text-xs tracking-wide text-gray-400";
  const number = "text-3xl font-semibold text-[#e8d487]";

  const actionBtn =
    "px-4 md:px-5 py-2 rounded-lg border border-[#e8d487] text-[#e8d487] hover:bg-[#e8d487] hover:text-black transition transform hover:-translate-y-0.5";

  const sectionCard =
    "rounded-xl bg-black/40 border border-[#2a2414] p-4 space-y-3";

  const sectionTitle = "text-sm font-semibold text-[#e8d487]";

  const listItem =
    "flex items-center justify-between text-xs py-1.5 border-b border-[#2a2414]/70 last:border-b-0";

  const listMain = "flex flex-col";
  const listLabel = "text-[11px] text-gray-300";
  const listSub = "text-[10px] text-gray-500";

  // -------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 md:space-y-8">
      {/* HEADER ROW */}
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-[#e8d487]">
            {labels?.dashboardTitle || 'Dashboard'}
          </h2>
          <p className="text-xs text-gray-500">
            {labels?.dashboardSubtitle || 'Business overview'}
          </p>
        </div>

        <div className="flex gap-3">
          {/* IMPORTANT: this is the only behavior change */}
          <button
            onClick={() =>
              navigate("/clients", { state: { openClientDrawer: true } })
            }
            className={actionBtn}
          >
            + {labels?.clientNewButton || 'New Client'}
          </button>

          <button
            onClick={() => navigate("/quotes/new")}
            className={actionBtn}
          >
            + {labels?.quoteNewButton || 'New Quote'}
          </button>
        </div>
      </div>

      {/* MAIN KPI ROW — 4 BOXES */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
        <div className={box} onClick={() => navigate("/quotes")}>
          <DocumentIcon className="w-4 h-4 mb-1 text-[#e8d487]" />
          <div className={label}>{(labels?.quotesTitle || 'QUOTES').toUpperCase()}</div>
          <div className={number}>{totalQuotes}</div>
        </div>

        <div
          className={box}
          onClick={() => navigate("/quotes?status=pending")}
        >
          <ClockIcon className="w-4 h-4 mb-1 text-[#e8d487]" />
          <div className={label}>{(labels?.statusPending || 'PENDING').toUpperCase()}</div>
          <div className={number}>{pending}</div>
        </div>

        <div
          className={box}
          onClick={() => navigate("/quotes?status=scheduled")}
        >
          <CalendarIcon className="w-4 h-4 mb-1 text-[#e8d487]" />
          <div className={label}>{(labels?.statusScheduled || 'SCHEDULED').toUpperCase()}</div>
          <div className={number}>{scheduled}</div>
        </div>

        <div className={box} onClick={() => navigate("/clients")}>
          <UsersIcon className="w-4 h-4 mb-1 text-[#e8d487]" />
          <div className={label}>{(labels?.clientsTitle || 'CLIENTS').toUpperCase()}</div>
          <div className={number}>{totalClients}</div>
        </div>
      </div>

      {/* SECONDARY ROW — 3 BOXES */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
        <div
          className={box}
          onClick={() => navigate("/quotes?filter=unsent")}
        >
          <MailIcon className="w-4 h-4 mb-1 text-[#e8d487]" />
          <div className={label}>UNSENT</div>
          <div className={number}>{unsent}</div>
        </div>

        <div
          className={box}
          onClick={() => navigate("/quotes?filter=expiring")}
        >
          <AlertIcon className="w-4 h-4 mb-1 text-[#e8d487]" />
          <div className={label}>EXPIRING 7 DAYS</div>
          <div className={number}>{expiringSoon}</div>
        </div>

        <div className={box} onClick={() => navigate("/reminders")}>
          <BellIcon className="w-4 h-4 mb-1 text-[#e8d487]" />
          <div className={label}>REMINDERS DUE</div>
          <div className={number}>{remindersDue}</div>
        </div>
      </div>

      {/* TODAY'S ACTIONS */}
      <div className={sectionCard}>
        <div className="flex items-center justify-between">
          <div className={sectionTitle}>Today&apos;s Actions</div>
        </div>

        {todaysActions.length === 0 ? (
          <div className="text-[11px] text-gray-500">
            You&apos;re all caught up for today. 🎉
          </div>
        ) : (
          <div className="space-y-1">
            {todaysActions.map((item, idx) => (
              <button
                key={idx}
                onClick={item.onClick}
                className={
                  listItem +
                  " w-full text-left hover:bg-black/40 px-2 rounded-md transition"
                }
              >
                <div className={listMain}>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-200">
                      {item.label}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-[#e8d487]/80 text-[#e8d487]">
                      {item.count}
                    </span>
                  </div>
                  {item.description && (
                    <div className={listSub}>{item.description}</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ACTIVITY SECTIONS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* RECENT QUOTES */}
        <div className={sectionCard}>
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <div className={sectionTitle}>Recent Quotes</div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setRecentFilter("all")}
                  className={pillClasses("all")}
                >
                  All
                </button>
                <button
                  onClick={() => setRecentFilter("pending")}
                  className={pillClasses("pending")}
                >
                  Pending
                </button>
                <button
                  onClick={() => setRecentFilter("scheduled")}
                  className={pillClasses("scheduled")}
                >
                  Scheduled
                </button>
                <button
                  onClick={() => setRecentFilter("unsent")}
                  className={pillClasses("unsent")}
                >
                  Unsent
                </button>
              </div>
            </div>

            <button
              onClick={() => navigate("/quotes")}
              className="text-[11px] text-gray-400 hover:text-[#e8d487] transition"
            >
              View all
            </button>
          </div>

          {filteredRecentQuotes.length === 0 ? (
            <div className="text-[11px] text-gray-500">
              No quotes match this filter.
            </div>
          ) : (
            <div className="space-y-1">
              {filteredRecentQuotes.map((q) => (
                <button
                  key={q.id}
                  onClick={() => navigate(`/quotes/${q.id}`)}
                  className={
                    listItem +
                    " w-full text-left hover:bg-black/40 px-2 rounded-md transition"
                  }
                >
                  <div className={listMain}>
                    <div className={listLabel}>
                      {q.clientName || "Unnamed Client"} —{" "}
                      {displayQuoteNumber(q)}
                    </div>
                    <div className={listSub}>
                      {formatDate(q.createdAt)} • {formatCurrency(q.total)}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={statusClass(q.status)}>
                      {statusLabel(q.status)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* SCHEDULED QUOTES */}
        <div className={sectionCard}>
          <div className="flex items-center justify-between">
            <div className={sectionTitle}>Scheduled Quotes</div>
            <button
              onClick={() => navigate("/quotes?status=scheduled")}
              className="text-[11px] text-gray-400 hover:text-[#e8d487] transition"
            >
              View all
            </button>
          </div>

          {scheduledQuotes.length === 0 ? (
            <div className="text-[11px] text-gray-500">
              No scheduled quotes yet.
            </div>
          ) : (
            <div className="space-y-1">
              {scheduledQuotes.map((q) => (
                <button
                  key={q.id}
                  onClick={() => navigate(`/quotes/${q.id}`)}
                  className={
                    listItem +
                    " w-full text-left hover:bg-black/40 px-2 rounded-md transition"
                  }
                >
                  <div className={listMain}>
                    <div className={listLabel}>
                      {q.clientName || "Unnamed Client"} —{" "}
                      {displayQuoteNumber(q)}
                    </div>
                    <div className={listSub}>
                      Updated {formatDate(q.updatedAt)} •{" "}
                      {formatCurrency(q.total)}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={statusClass(q.status)}>
                      {statusLabel(q.status)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
