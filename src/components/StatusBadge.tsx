// src/components/StatusBadge.tsx
import React from "react";
import type { QuoteStatus } from "@db/index";
import { useConfigStore } from "@store/useConfigStore";

export default function StatusBadge({
  status,
}: {
  status: QuoteStatus | undefined | null;
}) {
  const { config } = useConfigStore();
  const labels = config?.labels;

  if (!status) return null;

  const s = String(status).toLowerCase().replace(/\s+/g, "_");

  // Get label from config
  const getLabel = () => {
    if (!labels) return status;
    
    switch (s) {
      case "pending": return labels.statusPending;
      case "approved": return labels.statusApproved;
      case "scheduled": return labels.statusScheduled;
      case "in_progress": return labels.statusInProgress;
      case "completed": return labels.statusCompleted;
      case "canceled": return labels.statusCanceled;
      default: return status;
    }
  };

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
      {getLabel()}
    </span>
  );
}
