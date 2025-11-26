// -------------------------------------------------------------
// RemindersPage.tsx — Global reminders dashboard (final wired)
// -------------------------------------------------------------

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useClientsStore } from "@store/useClientsStore";
import type { Reminder } from "@db/index";

type Filter = "all" | "today" | "upcoming" | "overdue" | "completed";
type SortBy = "dateAsc" | "dateDesc" | "clientAsc" | "clientDesc" | "status";

type ReminderRow = {
  reminder: Reminder;
  clientId: string;
  clientName: string;
};

export default function RemindersPage() {
  const {
    clients,
    init,
    addReminder,
    updateReminder,
    deleteReminder,
  } = useClientsStore();

  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("dateAsc");

  // inline creation state
  const [creating, setCreating] = useState(false);
  const [newClientId, setNewClientId] = useState("");
  const [newNote, setNewNote] = useState("");
  const [newDate, setNewDate] = useState("");

  // inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  // snooze dropdown
  const [openSnoozeId, setOpenSnoozeId] = useState<string | null>(null);

  // initial load
  useEffect(() => {
    init();
  }, [init]);

  // flatten client reminders into rows
  const rows: ReminderRow[] = useMemo(() => {
    const out: ReminderRow[] = [];

    for (const c of clients) {
      const rs = c.reminders ?? [];
      for (const r of rs) {
        out.push({
          reminder: r,
          clientId: c.id,
          clientName: c.name || "Unnamed client",
        });
      }
    }

    return out;
  }, [clients]);

  // time anchors
  const now = Date.now();
  const startOfToday = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  })();
  const endOfToday = startOfToday + 24 * 60 * 60 * 1000;

  // filter + search
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();

    return rows.filter(({ reminder, clientName }) => {
      const isDone = !!reminder.done;
      const when = reminder.remindAt ?? 0;

      switch (filter) {
        case "today":
          if (isDone) return false;
          if (when < startOfToday || when >= endOfToday) return false;
          break;
        case "upcoming":
          if (isDone) return false;
          if (when <= now) return false;
          break;
        case "overdue":
          if (isDone) return false;
          if (!when || when >= startOfToday) return false;
          break;
        case "completed":
          if (!isDone) return false;
          break;
        case "all":
        default:
          break;
      }

      if (!q) return true;

      const note = (reminder.note ?? "").toLowerCase();
      return (
        clientName.toLowerCase().includes(q) ||
        note.includes(q)
      );
    });
  }, [rows, filter, search, now, startOfToday, endOfToday]);

  // sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "dateAsc":
          return (a.reminder.remindAt ?? 0) - (b.reminder.remindAt ?? 0);
        case "dateDesc":
          return (b.reminder.remindAt ?? 0) - (a.reminder.remindAt ?? 0);
        case "clientAsc":
          return a.clientName.localeCompare(b.clientName);
        case "clientDesc":
          return b.clientName.localeCompare(a.clientName);
        case "status": {
          const score = (r: Reminder) => {
            if (r.done) return 4;
            if (!r.remindAt) return 0;
            if (r.remindAt < startOfToday) return 1; // overdue
            if (r.remindAt < endOfToday) return 2;   // today
            return 3;                                // upcoming
          };
          return score(a.reminder) - score(b.reminder);
        }
        default:
          return 0;
      }
    });
  }, [filtered, sortBy, startOfToday, endOfToday]);

  // helpers
  const formatDateTime = (ts?: number) =>
    ts ? new Date(ts).toLocaleString() : "";

  const statusLabel = (r: Reminder) => {
    if (r.done) return "Done";
    if (!r.remindAt) return "No date";
    if (r.remindAt < startOfToday) return "Overdue";
    if (r.remindAt < endOfToday) return "Today";
    return "Upcoming";
  };

  const statusClass = (r: Reminder) => {
    const base = "px-2 py-0.5 text-[10px] rounded-full border";
    if (r.done) return `${base} border-emerald-500/60 text-emerald-300`;
    if (!r.remindAt) return `${base} border-gray-500/60 text-gray-300`;
    if (r.remindAt < startOfToday) return `${base} border-red-500/60 text-red-300`;
    if (r.remindAt < endOfToday) return `${base} border-yellow-500/60 text-yellow-300`;
    return `${base} border-sky-500/60 text-sky-300`;
  };

  // actions
  const toggleDone = async (row: ReminderRow) => {
    await updateReminder({
      clientId: row.clientId,
      reminderId: row.reminder.id,
      patch: { done: !row.reminder.done },
    });
  };

  const snooze = async (row: ReminderRow, days: number) => {
    const base = row.reminder.remindAt || Date.now();
    const next = base + days * 86400000;

    await updateReminder({
      clientId: row.clientId,
      reminderId: row.reminder.id,
      patch: { remindAt: next, snoozeDays: days, done: false },
    });

    setOpenSnoozeId(null);
  };

  const remove = async (row: ReminderRow) => {
    if (!window.confirm("Delete this reminder?")) return;
    await deleteReminder({
      clientId: row.clientId,
      reminderId: row.reminder.id,
    });
  };

  const startEdit = (row: ReminderRow) => {
    setEditingId(row.reminder.id);
    setEditText(row.reminder.note ?? "");
  };

  const saveEdit = async (row: ReminderRow) => {
    await updateReminder({
      clientId: row.clientId,
      reminderId: row.reminder.id,
      patch: { note: editText },
    });
    setEditingId(null);
  };

  // NEW REMINDER: this is wired exactly to your store signature
  const createNew = async () => {
    if (!newClientId || !newNote.trim()) return;

    // store requires a number; if no date is chosen, use "now"
    const ts = newDate ? new Date(newDate).getTime() : Date.now();

    await addReminder({
      clientId: newClientId,
      remindAt: ts,
      note: newNote.trim(),
      snoozeDays: 0,
      // "done" is set to false inside addReminder; it is not allowed here
    });

    setNewClientId("");
    setNewNote("");
    setNewDate("");
    setCreating(false);
  };

  const pill = (value: Filter, label: string) => (
    <button
      key={value}
      onClick={() => setFilter(value)}
      className={`px-2 py-0.5 rounded-full border text-[10px]
      ${
        filter === value
          ? "border-[#e8d487] text-[#e8d487] bg-black/60"
          : "border-[#2a2414] text-gray-400 hover:border-[#e8d487]/60 hover:text-[#e8d487]"
      }`}
    >
      {label}
    </button>
  );

  // -------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6 relative">

      {/* STICKY HEADER */}
      <div className="sticky top-0 bg-[#0b0b0b]/90 backdrop-blur-md pb-3 z-20">

        {/* TITLE + SEARCH + NEW */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
          <div>
            <h2 className="text-xl font-semibold text-[#e8d487]">Reminders</h2>
            <p className="text-xs text-gray-500">
              Follow-ups, callbacks, and scheduled touchpoints.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              className="input w-56 text-sm"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              onClick={() => setCreating((v) => !v)}
              className="btn-outline-gold px-3 py-1 text-[11px]"
            >
              + New
            </button>
          </div>
        </div>

        {/* FILTERS + SORT */}
        <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px]">
          <span className="text-gray-400 mr-1">Filter:</span>
          {pill("all", "All")}
          {pill("today", "Today")}
          {pill("upcoming", "Upcoming")}
          {pill("overdue", "Overdue")}
          {pill("completed", "Completed")}

          <div className="ml-auto flex items-center gap-2">
            <span className="text-gray-400">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="input text-[11px] px-2 py-1 w-36"
            >
              <option value="dateAsc">Date ↑</option>
              <option value="dateDesc">Date ↓</option>
              <option value="clientAsc">Client A→Z</option>
              <option value="clientDesc">Client Z→A</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>
      </div>

      {/* NEW REMINDER ROW */}
      {creating && (
        <div className="card p-3 space-y-3">
          <div className="flex flex-col md:flex-row gap-3">

            {/* client select */}
            <select
              className="input text-sm w-full md:w-48"
              value={newClientId}
              onChange={(e) => setNewClientId(e.target.value)}
            >
              <option value="">Select client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || "Unnamed client"}
                </option>
              ))}
            </select>

            {/* date */}
            <input
              type="datetime-local"
              className="input text-sm w-full md:w-60"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
          </div>

          <textarea
            className="input text-sm w-full h-20"
            placeholder="Reminder note..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
          />

          <div className="flex justify-end gap-2">
            <button
              className="text-gray-400 text-[11px] underline"
              onClick={() => {
                setCreating(false);
                setNewClientId("");
                setNewNote("");
                setNewDate("");
              }}
            >
              Cancel
            </button>

            <button
              className="btn-outline-gold px-4 py-1 text-[11px]"
              onClick={createNew}
              disabled={!newClientId || !newNote.trim()}
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* LIST */}
      <div className="card p-4 space-y-2">
        {sorted.length === 0 ? (
          <div className="text-xs text-gray-500">No reminders.</div>
        ) : (
          <div className="divide-y divide-[#2a2414]">
            {sorted.map((row) => {
              const { reminder, clientId, clientName } = row;
              const isEditing = editingId === reminder.id;
              const isSnoozeOpen = openSnoozeId === reminder.id;

              return (
                <div
                  key={reminder.id}
                  className="py-3 flex flex-col md:flex-row md:items-center gap-2 md:gap-4 transition-all"
                >
                  {/* LEFT */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs">
                      <Link
                        to={`/clients/${clientId}`}
                        className="text-[#e8d487] hover:underline"
                      >
                        {clientName}
                      </Link>

                      <span className={statusClass(reminder)}>
                        {statusLabel(reminder)}
                      </span>
                    </div>

                    {/* NOTE */}
                    {isEditing ? (
                      <div className="mt-1">
                        <textarea
                          className="input text-[11px] w-full h-20"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                        />

                        <div className="flex gap-2 mt-1">
                          <button
                            className="text-gray-400 text-[11px] underline"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </button>

                          <button
                            className="btn-outline-gold px-3 py-1 text-[11px]"
                            onClick={() => saveEdit(row)}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="text-[11px] text-gray-300 mt-1 whitespace-pre-line cursor-pointer hover:text-gray-200"
                        onClick={() => startEdit(row)}
                      >
                        {reminder.note || "(No note)"}
                      </div>
                    )}

                    <div className="text-[10px] text-gray-500 mt-0.5">
                      {reminder.remindAt
                        ? `Due: ${formatDateTime(reminder.remindAt)}`
                        : "No due date set"}
                    </div>
                  </div>

                  {/* ACTIONS */}
                  <div className="relative flex items-center gap-2 text-[11px]">
                    <button
                      className="btn-outline-gold px-3 py-1 text-[11px]"
                      onClick={() => toggleDone(row)}
                    >
                      {reminder.done ? "Mark Active" : "Mark Done"}
                    </button>

                    {!reminder.done && (
                      <div className="relative">
                        <button
                          className="text-gray-300 hover:text-[#e8d487] underline"
                          onClick={() =>
                            setOpenSnoozeId(isSnoozeOpen ? null : reminder.id)
                          }
                        >
                          Snooze
                        </button>

                        {isSnoozeOpen && (
                          <div className="absolute right-0 mt-1 bg-[#1a1a1a] border border-[#2a2414] rounded shadow-lg z-30 text-[11px]">
                            {[1, 3, 7, 14, 30].map((d) => (
                              <div
                                key={d}
                                className="px-3 py-1 hover:bg-black/40 cursor-pointer"
                                onClick={() => snooze(row, d)}
                              >
                                {d} day{d > 1 ? "s" : ""}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      className="text-red-400 hover:text-red-300 underline"
                      onClick={() => remove(row)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
