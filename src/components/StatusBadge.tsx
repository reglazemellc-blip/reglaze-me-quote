// src/components/StatusBadge.tsx
import React from "react";
import type { QuoteStatus } from "@db/index";

export default function StatusBadge({
  status,
}: {
  status: QuoteStatus | undefined | null;
}) {
  if (!status) return null;

  const s = String(status).toLowerCase().replace(/\s+/g, "_");

  const color =
    s === "approved"
      ? "text-green-400"
      : s === "scheduled"
      ? "text-blue-400"
      : s === "pending"
      ? "text-yellow-400"
      : s === "in_progress"
      ? "text-purple-400"
      : s === "completed"
      ? "text-green-500"
      : s === "canceled"
      ? "text-red-500"
      : "text-gray-400";

  return (
    <span className={`text-xs font-semibold ${color}`}>
      {status}
    </span>
  );
}
