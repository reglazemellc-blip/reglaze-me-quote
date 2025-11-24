// -------------------------------------------------------------
// ClientAutocomplete.tsx
// Smart client picker with inline add + drawer hook
// -------------------------------------------------------------

import { useEffect, useMemo, useRef, useState, KeyboardEvent } from "react";
import { useClientsStore } from "@store/useClientsStore";
import type { Client } from "@db/index";

type ClientAutocompleteProps = {
  value: Client | null;
  onChange: (client: Client | null) => void;

  label?: string;
  placeholder?: string;
  allowClear?: boolean;

  // Optional: open your existing "New Client" drawer
  onAddNewViaDrawer?: () => void;
};

export default function ClientAutocomplete({
  value,
  onChange,
  label = "Client",
  placeholder = "Search clients by name, phone, email, address",
  allowClear = true,
  onAddNewViaDrawer,
}: ClientAutocompleteProps) {
  const { clients, init, upsert, loading } = useClientsStore();

  const [inputValue, setInputValue] = useState<string>(value?.name ?? "");
  const [open, setOpen] = useState(false);
  const [showInlineCreate, setShowInlineCreate] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  // Inline create state
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newState, setNewState] = useState("");
  const [newZip, setNewZip] = useState("");
  const [savingInline, setSavingInline] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Load clients (safe to call multiple times)
  useEffect(() => {
    init();
  }, [init]);

  // keep input in sync when external value changes
  useEffect(() => {
    if (value) {
      setInputValue(value.name);
    }
  }, [value?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowInlineCreate(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // format address lines like on Clients page
  const formatAddress = (c: Client) => {
    const lines: string[] = [];
    if (c.address) lines.push(c.address);

    const cityStateZip = [c.city, c.state, c.zip].filter(Boolean).join(", ");
    if (cityStateZip) lines.push(cityStateZip);

    return lines.join("\n");
  };

  // filter clients by input
  const filtered = useMemo(() => {
    const q = inputValue.toLowerCase().trim();
    if (!q) return clients;

    return clients.filter((c) =>
      [
        c.name,
        c.phone,
        c.email,
        c.address,
        c.city,
        c.state,
        c.zip,
      ]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q))
    );
  }, [clients, inputValue]);

  const handleSelect = (c: Client) => {
    onChange(c);
    setInputValue(c.name);
    setOpen(false);
    setShowInlineCreate(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }

    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => {
        const max = filtered.length - 1;
        if (max < 0) return -1;
        const next = prev + 1;
        return next > max ? 0 : next;
      });
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => {
        const max = filtered.length - 1;
        if (max < 0) return -1;
        const next = prev - 1;
        return next < 0 ? max : next;
      });
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < filtered.length) {
        handleSelect(filtered[activeIndex]);
      } else if (!filtered.length) {
        // no matches -> jump to create
        setShowInlineCreate(true);
      }
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setShowInlineCreate(false);
      setActiveIndex(-1);
    }
  };

  const clearSelection = () => {
    onChange(null);
    setInputValue("");
    setOpen(false);
    setShowInlineCreate(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const handleInlineCreate = async () => {
    if (!newName.trim()) return;
    setSavingInline(true);
    try {
      const id =
        (typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `client_${Date.now()}`);

      const createdAt = Date.now();

      const created = await upsert({
        id,
        name: newName.trim(),
        phone: newPhone.trim() || undefined,
        email: newEmail.trim() || undefined,
        address: newAddress.trim() || undefined,
        city: newCity.trim() || undefined,
        state: newState.trim() || undefined,
        zip: newZip.trim() || undefined,
        createdAt,
      });

      // reset inline fields
      setNewName("");
      setNewPhone("");
      setNewEmail("");
      setNewAddress("");
      setNewCity("");
      setNewState("");
      setNewZip("");

      // select new client
      handleSelect(created);
    } finally {
      setSavingInline(false);
    }
  };

  return (
    <div className="space-y-1 relative z-0" ref={containerRef}>
      {label && (
        <label className="block text-[11px] uppercase tracking-wide text-gray-400">
          {label}
        </label>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          className="
            w-full
            rounded-xl
            bg-[#151515]
            border border-[#2a2a2a]
            px-3 py-2
            text-sm
            text-[#f5f3da]
            placeholder:text-gray-500
            focus:outline-none
            focus:border-[#e8d487]
            focus:shadow-[0_0_0_1px_rgba(232,212,135,0.5)]
            pr-8
          "
          value={inputValue}
          placeholder={placeholder}
          onChange={(e) => {
            setInputValue(e.target.value);
            setOpen(true);
            setShowInlineCreate(false);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />

        {allowClear && (value || inputValue) && (
          <button
            type="button"
            onClick={clearSelection}
            className="
              absolute
              inset-y-0
              right-2
              my-auto
              h-5 w-5
              flex items-center justify-center
              text-gray-500
              hover:text-gray-300
              text-xs
            "
          >
            ✕
          </button>
        )}
      </div>

      {/* DROPDOWN */}
      {open && (
        <div
          className="
            absolute
            left-0
            right-0
            mt-1
            rounded-xl
            bg-[#151515]
            border border-[#2a2a2a]
            shadow-card
            max-h-72
            overflow-auto
            z-40
          "
        >
          {/* Loading */}
          {loading && (
            <div className="px-3 py-2 text-xs text-gray-500">
              Loading clients…
            </div>
          )}

          {/* Existing matches */}
          {!loading && filtered.length > 0 && (
            <ul className="py-1">
              {filtered.map((c, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(c)}
                      className={`
                        w-full text-left px-3 py-2 text-sm
                        ${
                          isActive
                            ? "bg-black/60 text-[#f5f3da]"
                            : "hover:bg-black/40"
                        }
                      `}
                    >
                      <div className="font-medium text-[#f5f3da]">
                        {c.name}
                      </div>
                      <div className="mt-0.5 text-[11px] text-gray-400 space-y-0.5">
                        <div className="flex gap-2 flex-wrap">
                          {c.phone && <span>{c.phone}</span>}
                          {c.email && <span>{c.email}</span>}
                        </div>
                        {(c.address || c.city || c.state || c.zip) && (
                          <div className="whitespace-pre-line">
                            {formatAddress(c)}
                          </div>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {/* No matches */}
          {!loading && filtered.length === 0 && !showInlineCreate && (
            <div className="px-3 py-3 text-xs text-gray-400 space-y-2">
              <div>No matching clients.</div>
            </div>
          )}

          {/* ACTIONS: Add new via drawer + inline */}
          {!showInlineCreate && (
            <div className="border-t border-[#2a2a2a] px-3 py-2 flex flex-col gap-1">
              {onAddNewViaDrawer && (
                <button
                  type="button"
                  onClick={onAddNewViaDrawer}
                  className="
                    text-xs
                    text-[#e8d487]
                    hover:text-accent1
                    text-left
                  "
                >
                  + Add new client in drawer
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowInlineCreate(true)}
                className="
                  text-xs
                  text-gray-300
                  hover:text-[#f5f3da]
                  text-left
                "
              >
                + Quick add client here
              </button>
            </div>
          )}

          {/* INLINE CREATE FORM */}
          {showInlineCreate && (
            <div className="border-t border-[#2a2a2a] px-3 py-3 space-y-2 text-xs text-gray-200">
              <div className="font-semibold text-[11px] text-gray-300 mb-1">
                New Client
              </div>

              <div className="space-y-1.5">
                <input
                  className="w-full rounded-lg bg-black/40 border border-[#2a2a2a] px-2 py-1 text-xs focus:outline-none focus:border-[#e8d487]"
                  placeholder="Name *"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-lg bg-black/40 border border-[#2a2a2a] px-2 py-1 text-xs focus:outline-none focus:border-[#e8d487]"
                    placeholder="Phone"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                  />
                  <input
                    className="flex-1 rounded-lg bg-black/40 border border-[#2a2a2a] px-2 py-1 text-xs focus:outline-none focus:border-[#e8d487]"
                    placeholder="Email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>
                <textarea
                  className="w-full rounded-lg bg-black/40 border border-[#2a2a2a] px-2 py-1 text-xs focus:outline-none focus:border-[#e8d487] resize-none h-14"
                  placeholder="Street address"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                />
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-lg bg-black/40 border border-[#2a2a2a] px-2 py-1 text-xs focus:outline-none focus:border-[#e8d487]"
                    placeholder="City"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                  />
                  <input
                    className="w-16 rounded-lg bg-black/40 border border-[#2a2a2a] px-2 py-1 text-xs focus:outline-none focus:border-[#e8d487]"
                    placeholder="State"
                    value={newState}
                    onChange={(e) => setNewState(e.target.value)}
                  />
                  <input
                    className="w-20 rounded-lg bg-black/40 border border-[#2a2a2a] px-2 py-1 text-xs focus:outline-none focus:border-[#e8d487]"
                    placeholder="Zip"
                    value={newZip}
                    onChange={(e) => setNewZip(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowInlineCreate(false);
                    setSavingInline(false);
                  }}
                  className="text-[11px] text-gray-400 hover:text-gray-200"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleInlineCreate}
                  disabled={savingInline || !newName.trim()}
                  className={`
                    text-[11px] px-3 py-1 rounded-full
                    border
                    ${
                      savingInline || !newName.trim()
                        ? "border-[#444] text-gray-500"
                        : "border-[#e8d487]/70 text-[#e8d487] hover:bg-black/40"
                    }
                  `}
                >
                  {savingInline ? "Saving…" : "Save & select"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
