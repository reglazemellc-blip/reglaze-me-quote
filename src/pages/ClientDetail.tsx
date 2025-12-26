// src/pages/ClientDetail.tsx

import React, { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  arrayUnion,
} from "firebase/firestore";



import { db, storage } from "../firebase";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

import type { Attachment, AttachmentType, WorkflowStatus } from "@db/index";
import { useClientsStore } from "@store/useClientsStore";
import { useContractsStore } from "@store/useContractsStore";
import { useConfigStore } from "@store/useConfigStore";
import ClientDrawer from "@components/ClientDrawer";
import { useToastStore } from '@store/useToastStore'
import { Calendar, FileCheck, FileText, Clock, Send, CheckCircle2, X } from 'lucide-react'

// Time options for dropdown
const timeOptions = [
  "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM",
  "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
  "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM",
  "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM", "6:00 PM"
];

// Workflow status configuration
const workflowStatuses: { value: WorkflowStatus; label: string; color: string; bgColor: string }[] = [
  { value: "new", label: "New", color: "text-gray-400", bgColor: "bg-gray-600" },
  { value: "docs_sent", label: "Docs Sent", color: "text-yellow-400", bgColor: "bg-yellow-600" },
  { value: "waiting_prejob", label: "Waiting Pre-Job", color: "text-orange-400", bgColor: "bg-orange-600" },
  { value: "ready_to_schedule", label: "Ready to Schedule", color: "text-cyan-400", bgColor: "bg-cyan-600" },
  { value: "scheduled", label: "Scheduled", color: "text-blue-400", bgColor: "bg-blue-600" },
  { value: "in_progress", label: "In Progress", color: "text-indigo-400", bgColor: "bg-indigo-600" },
  { value: "completed", label: "Completed", color: "text-green-400", bgColor: "bg-green-600" },
  { value: "invoiced", label: "Invoiced", color: "text-purple-400", bgColor: "bg-purple-600" },
  { value: "paid", label: "Paid", color: "text-emerald-400", bgColor: "bg-emerald-600" },
]


// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------
function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

type ConversationChannel = "call" | "text" | "email" | "in_person" | "other";

type ConversationEntry = {
  id: string;
  message: string;
  channel: ConversationChannel;
  createdAt: number;
  attachments?: { url: string; name: string }[];
};

type QuoteSummary = {
  id: string;
  quoteNumber?: string | null;
  status?: string;
  workflowStatus?: string;
  total?: number;
  createdAt?: number;
};

// -------------------------------------------------------------
// Component
// -------------------------------------------------------------
export default function ClientDetail() {
  
  const { id } = useParams();
  const clientId = id ?? "";

  const navigate = useNavigate();
  const { remove } = useClientsStore();

  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<any>(null);

  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  // Conversations
  const [newChannel, setNewChannel] = useState<ConversationChannel>("text");
  const [newMessage, setNewMessage] = useState("");
  const [convUploading, setConvUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [editingChannel, setEditingChannel] =
    useState<ConversationChannel>("text");

  // Quotes for this client
  const [quotes, setQuotes] = useState<QuoteSummary[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(true);
    const [invoices, setInvoices] = useState<any[]>([]);


  // Contracts for this client
  const { contracts, init: initContracts } = useContractsStore();
  const clientContracts = contracts.filter((c) => c.clientId === clientId);

  // Edit drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Schedule modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  // -------------------------------------------------------------
  // Load client + their quotes
  // -------------------------------------------------------------
  useEffect(() => {
    initContracts();
    
    if (!clientId || clientId === "new") {
      setLoading(false);
      setClient(null);
      setLoadingQuotes(false);
      return;
    }

    async function load() {
      try {
        // ----- client -----
        const refDoc = doc(db, "clients", clientId);
        const snap = await getDoc(refDoc);

        if (!snap.exists()) {
          setClient(null);
          return;
        }

        const data: any = snap.data() || {};

        // Normalize attachments
        const rawAttachments: any[] = Array.isArray(data.attachments)
          ? data.attachments
          : [];

                const normalized: Attachment[] = rawAttachments.filter(
          (a) => a && a.url
        );


        // Legacy photos[] → attachments
        const legacyPhotos: string[] = Array.isArray(data.photos)
          ? data.photos
          : [];

        legacyPhotos.forEach((url) => {
          if (!normalized.some((att) => att.url === url)) {
            normalized.push({
              id: createId(),
              name: "Photo",
              url,
              type: "photo",
              createdAt: Date.now(),
              path: "",
            });
          }
        });

        setClient({
          id: snap.id,
          ...data,
          attachments: normalized,
          photos: data.photos || [],
          conversations: data.conversations || [],
          reminders: data.reminders || [],
        });

        // ----- quotes for this client -----
       const qSnap = await getDocs(
  query(
    collection(db, "quotes"),
    where("clientId", "==", clientId),
    where("tenantId", "==", useConfigStore.getState().activeTenantId)
  )
);


        const qList: QuoteSummary[] = qSnap.docs.map((d) => {
          const qd = d.data() as any;

          return {
            id: d.id,
            quoteNumber: qd.quoteNumber ?? null,
            status: qd.status ?? "pending",
            workflowStatus: qd.workflowStatus ?? "new",
            total:
              typeof qd.total === "number"
                ? qd.total
                : typeof qd.subtotal === "number"
                ? qd.subtotal
                : 0,
            createdAt: qd.createdAt ?? 0,
          };
        });

        setQuotes(qList);
                // ----- invoices for this client -----
        const iSnap = await getDocs(
          query(
            collection(db, "invoices"),
            where("clientId", "==", clientId),
            where(
              "tenantId",
              "==",
              useConfigStore.getState().activeTenantId
            )
          )
        );

        const iList = iSnap.docs.map((d) => {
          const idata = d.data() as any;
           return {
           id: d.id,
           invoiceNumber: idata.invoiceNumber ?? null,

            status: idata.status ?? "draft",
            total:
              typeof idata.total === "number"
                ? idata.total
                : typeof idata.amount === "number"
                ? idata.amount
                : 0,
            createdAt: idata.createdAt ?? 0,
          };
        });

        setInvoices(iList);

      } catch (err) {
        console.error(err);
        useToastStore.getState().show("Photo upload failed. Check console.");


      } finally {
        setLoading(false);
        setLoadingQuotes(false);
      }
    }

    load();
  }, [clientId]);

  // -------------------------------------------------------------
  // Delete client (via useClientsStore.remove)
  // -------------------------------------------------------------
  async function handleDeleteClient() {
    if (!client) return;
    const ok = window.confirm(
      "Delete this client and ALL their quotes? This cannot be undone."
    );
    if (!ok) return;

    try {
      await remove(client.id);
      navigate("/clients");
    } catch (err) {
      console.error(err);
      useToastStore.getState().show("Operation failed. See console.");


    }
  }

  // -------------------------------------------------------------
  // Photo Upload → attachments[]
  // -------------------------------------------------------------
  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!client) return;

    const files: File[] = Array.from(e.target.files ?? []) as File[];
    if (files.length === 0) return;

    setUploadingPhotos(true);

    try {
      const existing: Attachment[] = client.attachments || [];
      const additions: Attachment[] = [];

      for (const file of files) {
        const tenantId =
  client.tenantId ?? useConfigStore.getState().activeTenantId;

const path = `tenants/${tenantId}/clients/${client.id}/attachments/${Date.now()}_${file.name}`;

        const storageRef = ref(storage, path);

        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);

        additions.push({
          id: createId(),
          name: file.name,
          url,
          type: "photo",
          createdAt: Date.now(),
          path,
        });
      }

           const refDoc = doc(db, "clients", client.id);

      for (const att of additions) {
        await updateDoc(refDoc, {
          attachments: arrayUnion(att),
          tenantId: client.tenantId ?? useConfigStore.getState().activeTenantId,
        });
      }

           setClient((prev: any) => ({
        ...prev,
        attachments: [...(prev.attachments || []), ...additions],
      }));

    } catch (err) {
      console.error(err);
      useToastStore.getState().show("Import successful.");

    } finally {
      setUploadingPhotos(false);
      if (photoInputRef.current) {
        photoInputRef.current.value = "";
      }
    }
  }

  // -------------------------------------------------------------
  // Delete photo (from Storage + attachments[])
  // -------------------------------------------------------------
  async function deletePhoto(att: Attachment) {
    if (!client) return;

    try {
      if (att.path) {
        const storageRef = ref(storage, att.path);
        await deleteObject(storageRef);
      }
    } catch (err) {
      console.error("Storage delete failed (continuing):", err);
    }

    try {
      const existing: Attachment[] = client.attachments || [];
      const updated = existing.filter((a) => a.id !== att.id);

      const refDoc = doc(db, "clients", client.id);
      await updateDoc(refDoc, {
        attachments: updated,
      });

      setClient((prev: any) => ({
        ...prev,
        attachments: updated,
      }));
    } catch (err) {
      console.error("Failed to update Firestore after delete:", err);
       useToastStore.getState().show("Failed to update Firestore after delete.");

    }
  }

  // -------------------------------------------------------------
  // Conversations
  // -------------------------------------------------------------
  async function addConversation() {
    if (!client) return;
    if (!newMessage.trim()) return;

    const entry: ConversationEntry = {
      id: String(Date.now()),
      message: newMessage.trim(),
      channel: newChannel,
      createdAt: Date.now(),
      attachments: [],
    };

    const refDoc = doc(db, "clients", client.id);

    const existing: ConversationEntry[] = client.conversations || [];
    const updatedList = [...existing, entry];

    await updateDoc(refDoc, {
      conversations: updatedList,
    });

    setClient((prev: any) => ({
      ...prev,
      conversations: updatedList,
    }));

    setNewMessage("");
  }

  function startEditConversation(c: ConversationEntry) {
    setEditingId(c.id);
    setEditingText(c.message);
    setEditingChannel(c.channel);
  }

  function cancelEditConversation() {
    setEditingId(null);
    setEditingText("");
  }

  async function saveEditConversation() {
    if (!client || !editingId) return;
    const text = editingText.trim();
    if (!text) return;

    const refDoc = doc(db, "clients", client.id);

    const existing: ConversationEntry[] = client.conversations || [];
    const updatedList = existing.map((c) =>
      c.id === editingId
        ? { ...c, message: text, channel: editingChannel }
        : c
    );

    await updateDoc(refDoc, {
      conversations: updatedList,
    });

    setClient((prev: any) => ({
      ...prev,
      conversations: updatedList,
    }));

    setEditingId(null);
    setEditingText("");
  }

  async function deleteConversation(entry: ConversationEntry) {
    if (!client) return;

    const refDoc = doc(db, "clients", client.id);
    const existing: ConversationEntry[] = client.conversations || [];
    const updatedList = existing.filter((c) => c.id !== entry.id);

    await updateDoc(refDoc, {
      conversations: updatedList,
    });

    setClient((prev: any) => ({
      ...prev,
      conversations: updatedList,
    }));

    if (editingId === entry.id) {
      setEditingId(null);
      setEditingText("");
    }
  }

  async function uploadConversationFile(
    e: React.ChangeEvent<HTMLInputElement>,
    conv: ConversationEntry
  ) {
    if (!client) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setConvUploading(true);

    try {
      const storageRef = ref(
        storage,
        `clients/${client.id}/conversations/${conv.id}_${file.name}`
      );

      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      const updatedConv: ConversationEntry = {
        ...conv,
        attachments: [...(conv.attachments || []), { url, name: file.name }],
      };

      const existing: ConversationEntry[] = client.conversations || [];
      const updatedList = existing.map((c) =>
        c.id === conv.id ? updatedConv : c
      );

      const refDoc = doc(db, "clients", client.id);
      await updateDoc(refDoc, { conversations: updatedList });

      setClient((prev: any) => ({
        ...prev,
        conversations: updatedList,
      }));
    } catch (err) {
      console.error(err);
      useToastStore.getState().show("Failed to upload file.");
    } finally {
      setConvUploading(false);
      e.target.value = "";
    }
  }

  // -------------------------------------------------------------
  // Render
  // -------------------------------------------------------------
  if (loading)
    return (
      <div className="text-center p-10 text-gray-400">Loading client…</div>
    );

  if (!client)
    return (
      <div className="text-center p-10 text-red-400">Client not found.</div>
    );

  const conversations: ConversationEntry[] = client.conversations || [];
  const reminders = client.reminders || [];

  const allAttachments: Attachment[] = client.attachments || [];
  const photoAttachments: Attachment[] = allAttachments.filter(
    (a) => a.type === "photo"
  );

  return (
    <>
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6 text-[#f5f3da]">
        {/* PAGE HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-[#e8d487]">
              {client.name}
            </h1>
            <p className="text-xs text-gray-500">
              Full profile, history, photos, reminders, and quotes.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 justify-start md:justify-end">
            <button
              className="btn-outline-gold px-4 py-1.5 text-xs md:text-sm"
              onClick={() => setDrawerOpen(true)}
            >
              Edit Client
            </button>

            <button
              className="btn-gold px-4 py-1.5 text-xs md:text-sm"
              onClick={() => navigate(`/quotes/new?clientId=${client.id}`)}
            >
              New Quote
            </button>
            <button
              className="px-4 py-1.5 text-xs md:text-sm rounded-lg border border-red-500/70 text-red-400 hover:bg-red-500 hover:text-black transition"
              onClick={handleDeleteClient}
            >
              Delete
            </button>
          </div>
        </div>

        {/* WORKFLOW STATUS PIPELINE */}
        <div className="card p-4 md:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#e8d487] flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Workflow Status
            </h2>

            {/* Status Dropdown */}
            <select
              className="input text-xs md:text-sm"
              value={client.workflowStatus ?? client.status ?? 'new'}
              onChange={async (e) => {
                const next = e.target.value as WorkflowStatus
                setClient((prev: any) => ({ ...prev, workflowStatus: next, status: next }))
                await updateDoc(doc(db, 'clients', client.id), {
                  workflowStatus: next,
                  status: next,
                  updatedAt: Date.now(),
                })
                useToastStore.getState().show(`Status updated to ${workflowStatuses.find(s => s.value === next)?.label}`)
              }}
            >
              {workflowStatuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {/* Pipeline Visualization */}
          <div className="overflow-x-auto pb-2">
            <div className="flex items-center gap-1 min-w-max">
              {workflowStatuses.map((status, idx) => {
                const currentIdx = workflowStatuses.findIndex(
                  (s) => s.value === (client.workflowStatus ?? client.status ?? 'new')
                )
                const isCompleted = idx < currentIdx
                const isCurrent = idx === currentIdx
                const isPending = idx > currentIdx

                return (
                  <React.Fragment key={status.value}>
                    <button
                      onClick={async () => {
                        setClient((prev: any) => ({ ...prev, workflowStatus: status.value, status: status.value }))
                        await updateDoc(doc(db, 'clients', client.id), {
                          workflowStatus: status.value,
                          status: status.value,
                          updatedAt: Date.now(),
                        })
                        useToastStore.getState().show(`Status updated to ${status.label}`)
                      }}
                      className={`
                        flex flex-col items-center justify-center px-2 py-2 rounded-lg transition-all
                        min-w-[70px] md:min-w-[80px]
                        ${isCurrent
                          ? `${status.bgColor} text-white ring-2 ring-[#e8d487] ring-offset-2 ring-offset-black`
                          : isCompleted
                            ? 'bg-green-900/50 text-green-300 border border-green-700/50'
                            : 'bg-black/30 text-gray-500 border border-gray-700/50 hover:bg-black/50'
                        }
                      `}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 mb-1" />
                      ) : isCurrent ? (
                        <div className="w-3 h-3 rounded-full bg-white mb-1 animate-pulse" />
                      ) : (
                        <div className="w-3 h-3 rounded-full border border-gray-500 mb-1" />
                      )}
                      <span className="text-[10px] md:text-[11px] font-medium text-center leading-tight">
                        {status.label}
                      </span>
                    </button>

                    {idx < workflowStatuses.length - 1 && (
                      <div className={`w-4 h-0.5 ${isCompleted ? 'bg-green-500' : 'bg-gray-700'}`} />
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          </div>

          {/* Document Tracking & Scheduling Info */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {/* Document Status */}
            <div className="bg-black/30 rounded-lg p-3 border border-gray-700/50">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-[#e8d487]" />
                <span className="font-medium text-gray-300">Documents</span>
              </div>
              <div className="space-y-1 text-gray-400">
                <div className="flex items-center justify-between">
                  <span>Pre-Job Sent:</span>
                  <span className={client.documentTracking?.preJobSent ? 'text-green-400' : 'text-gray-500'}>
                    {client.documentTracking?.preJobSent
                      ? new Date(client.documentTracking.preJobSent).toLocaleDateString()
                      : 'Not sent'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Pre-Job Received:</span>
                  <span className={client.documentTracking?.preJobReceived ? 'text-green-400' : 'text-gray-500'}>
                    {client.documentTracking?.preJobReceived
                      ? new Date(client.documentTracking.preJobReceived).toLocaleDateString()
                      : 'Not received'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Prep & Care Sent:</span>
                  <span className={client.documentTracking?.prepCareSent ? 'text-green-400' : 'text-gray-500'}>
                    {client.documentTracking?.prepCareSent
                      ? new Date(client.documentTracking.prepCareSent).toLocaleDateString()
                      : 'Not sent'}
                  </span>
                </div>
              </div>
            </div>

            {/* Schedule Info */}
            <div className="bg-black/30 rounded-lg p-3 border border-gray-700/50">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-[#e8d487]" />
                <span className="font-medium text-gray-300">Schedule</span>
              </div>
              {client.scheduledDate ? (
                <div className="text-gray-300">
                  <div className="text-lg font-semibold text-[#e8d487]">
                    {new Date(client.scheduledDate).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                  {client.scheduledTime && (
                    <div className="text-gray-400">@ {client.scheduledTime}</div>
                  )}
                </div>
              ) : (
                <div className="text-gray-500">Not scheduled</div>
              )}
              <button
                className="mt-2 text-[#e8d487] underline text-[11px]"
                onClick={() => {
                  setScheduleDate(client.scheduledDate || '');
                  setScheduleTime(client.scheduledTime || '');
                  setShowScheduleModal(true);
                }}
              >
                {client.scheduledDate ? 'Change Schedule' : 'Set Schedule'}
              </button>
            </div>

            {/* Quick Actions */}
            <div className="bg-black/30 rounded-lg p-3 border border-gray-700/50">
              <div className="flex items-center gap-2 mb-2">
                <Send className="w-4 h-4 text-[#e8d487]" />
                <span className="font-medium text-gray-300">Quick Actions</span>
              </div>
              <div className="space-y-2">
                <button
                  className="w-full text-left px-2 py-1.5 rounded bg-black/30 text-gray-300 hover:bg-black/50 transition text-[11px]"
                  onClick={async () => {
                    setClient((prev: any) => ({
                      ...prev,
                      documentTracking: {
                        ...prev.documentTracking,
                        preJobSent: Date.now()
                      },
                      workflowStatus: 'docs_sent'
                    }))
                    await updateDoc(doc(db, 'clients', client.id), {
                      'documentTracking.preJobSent': Date.now(),
                      workflowStatus: 'docs_sent',
                      updatedAt: Date.now(),
                    })
                    useToastStore.getState().show('Marked Pre-Job as sent')
                  }}
                >
                  Mark Pre-Job Sent
                </button>
                <button
                  className="w-full text-left px-2 py-1.5 rounded bg-black/30 text-gray-300 hover:bg-black/50 transition text-[11px]"
                  onClick={async () => {
                    setClient((prev: any) => ({
                      ...prev,
                      documentTracking: {
                        ...prev.documentTracking,
                        preJobReceived: Date.now()
                      },
                      workflowStatus: 'ready_to_schedule'
                    }))
                    await updateDoc(doc(db, 'clients', client.id), {
                      'documentTracking.preJobReceived': Date.now(),
                      workflowStatus: 'ready_to_schedule',
                      updatedAt: Date.now(),
                    })
                    useToastStore.getState().show('Marked Pre-Job as received - Ready to schedule!')
                  }}
                >
                  Mark Pre-Job Received
                </button>
                <button
                  className="w-full text-left px-2 py-1.5 rounded bg-black/30 text-gray-300 hover:bg-black/50 transition text-[11px]"
                  onClick={async () => {
                    setClient((prev: any) => ({
                      ...prev,
                      documentTracking: {
                        ...prev.documentTracking,
                        prepCareSent: Date.now()
                      }
                    }))
                    await updateDoc(doc(db, 'clients', client.id), {
                      'documentTracking.prepCareSent': Date.now(),
                      updatedAt: Date.now(),
                    })
                    useToastStore.getState().show('Marked Prep & Care as sent')
                  }}
                >
                  Mark Prep & Care Sent
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-4 md:gap-5">
          {/* LEFT COLUMN --------------------------------------------------- */}
          <div className="space-y-4 md:space-y-5">
            {/* CLIENT CARD */}
            <div className="card p-5 md:p-6">
              <div className="flex flex-col gap-3">
                <div className="text-[11px] tracking-wide text-gray-400">
                  CLIENT
                </div>

                <div className="text-sm text-gray-300 space-y-1">
                  {client.phone && <div>{client.phone}</div>}
                  {client.email && <div>{client.email}</div>}
                  {client.address && (
                    <div className="whitespace-pre-line">{client.address}</div>
                  )}
                </div>

                {/* Photos header */}
                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">Photos</div>
                    {photoAttachments.length === 0 && (
                      <div className="text-xs text-gray-400">
                        No photos uploaded.
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="text-[11px] text-[#e8d487] underline"
                    onClick={() => photoInputRef.current?.click()}


                  >
                    Add Photos
                  </button>
                </div>

                <input
                  ref={photoInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handlePhotoUpload}


                />

                {uploadingPhotos && (
                  <div className="text-xs text-gray-400 mt-1">Uploading…</div>
                )}

                {photoAttachments.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
                    {photoAttachments.map((att) => (
                      <div key={att.id} className="relative group">
                        <img
                          src={att.url}
                          className="rounded border border-gray-700 w-full h-28 md:h-32 object-cover"
                        />
                        <button
                          className="absolute top-1 right-1 text-red-400 text-[10px] bg-black/70 rounded px-1"
                          onClick={() => deletePhoto(att)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ATTACHMENTS */}
            <div className="card p-5 md:p-6">
              <h2 className="text-sm font-semibold border-l-2 border-[#e8d487] pl-2 mb-2">
                Attachments
              </h2>

              {allAttachments.length === 0 ? (
                <p className="text-xs text-gray-400">No attachments.</p>
              ) : (
                <ul className="mt-1 space-y-1 text-xs">
                  {allAttachments.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between gap-2"
                    >
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#e8d487] underline truncate"
                      >
                        {a.name || "Attachment"}
                      </a>
                      <button
                        className="text-[11px] text-red-400"
                        onClick={() => deletePhoto(a)}
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN -------------------------------------------------- */}
          <div className="space-y-4 md:space-y-5">
            {/* CONVERSATIONS */}
            <div className="card p-5 md:p-6 space-y-3">
              <h2 className="text-sm font-semibold border-l-2 border-[#e8d487] pl-2">
                Conversations
              </h2>

              {/* composer */}
              <div className="space-y-2">
                <div className="flex flex-col md:flex-row md:items-center gap-2">
                  <select
                    className="input md:w-40 text-xs"
                    value={newChannel}
                    onChange={(e) =>
                      setNewChannel(e.target.value as ConversationChannel)
                    }
                  >
                    <option value="call">Call</option>
                    <option value="text">Text</option>
                    <option value="email">Email</option>
                    <option value="in_person">In person</option>
                    <option value="other">Other</option>
                  </select>

                  <textarea
                    className="input flex-1 h-20 text-xs"
                    placeholder="Paste conversation or notes…"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                </div>

                <button
                  className="btn-gold text-xs px-3 py-1.5"
                  onClick={addConversation}


                >
                  Add Conversation
                </button>
              </div>

              {convUploading && (
                <div className="text-[11px] text-gray-400">
                  Uploading file…
                </div>
              )}

              <div className="space-y-3 mt-1">
                {conversations.length === 0 && (
                  <p className="text-xs text-gray-400">
                    No conversation logs.
                  </p>
                )}

                {conversations.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 bg-black/40 rounded border border-[#2a2a2a] text-xs"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <div className="text-[10px] text-gray-400">
                          {new Date(c.createdAt).toLocaleString()} —{" "}
                          {c.channel}
                        </div>

                        {editingId === c.id ? (
                          <div className="mt-2 space-y-2">
                            <select
                              className="input w-40 text-[11px]"
                              value={editingChannel}
                              onChange={(e) =>
                                setEditingChannel(
                                  e.target.value as ConversationChannel
                                )
                              }
                            >
                              <option value="call">Call</option>
                              <option value="text">Text</option>
                              <option value="email">Email</option>
                              <option value="in_person">In person</option>
                              <option value="other">Other</option>
                            </select>

                            <textarea
                              className="input w-full h-20 text-xs"
                              value={editingText}
                              onChange={(e) =>
                                setEditingText(e.target.value)
                              }
                            />

                            <div className="flex gap-2">
                              <button
                                className="btn-gold text-[11px] px-3"
                                onClick={saveEditConversation}
                              >
                                Save
                              </button>
                              <button
                                className="btn-outline-gold text-[11px] px-3"
                                onClick={cancelEditConversation}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="whitespace-pre-line mt-1">
                            {c.message}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <button
                          className="text-[11px] text-gray-300"
                          onClick={() => startEditConversation(c)}


                        >
                          ✎ Edit
                        </button>
                        <button
                          className="text-[11px] text-red-400"
                          onClick={() => deleteConversation(c)}


                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {(c.attachments || []).length > 0 && (
                      <div className="mt-2 space-y-1">
                        {c.attachments!.map((a: any, idx: number) => (
                          <a
                            key={idx}
                            href={a.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block text-[#e8d487] underline text-[11px]"
                          >
                            {a.name}
                          </a>
                        ))}
                      </div>
                    )}

                    <div className="mt-2">
                      <input
                        type="file"
                        onChange={(e) => uploadConversationFile(e, c)}


                        className="text-[11px]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* REMINDERS */}
            <div className="card p-5 md:p-6">
              <h2 className="text-sm font-semibold border-l-2 border-[#e8d487] pl-2 mb-2">
                Reminders
              </h2>

              {reminders.length === 0 ? (
                <p className="text-xs text-gray-400">No reminders.</p>
              ) : (
                <ul className="mt-1 space-y-1 text-xs">
                  {reminders.map((r: any) => (
                    <li key={r.id}>{r.note || "Reminder"}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* QUOTES */}
            <div className="card p-5 md:p-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold border-l-2 border-[#e8d487] pl-2">
                  Quotes
                </h2>

                <button
                  className="btn-gold text-xs px-3 py-1.5"
                  onClick={() => navigate(`/quotes/new?clientId=${client.id}`)}


                >
                  New Quote
                </button>
              </div>

              {loadingQuotes ? (
                <p className="text-xs text-gray-400">Loading quotes…</p>
              ) : quotes.length === 0 ? (
                <p className="text-xs text-gray-400">No quotes yet.</p>
              ) : (
                <div className="space-y-2 text-xs">
                  {quotes.map((q) => {
                    // Status colors for workflow status
                    const statusColors: Record<string, string> = {
                      new: 'bg-gray-800 text-gray-300 border-gray-600',
                      docs_sent: 'bg-yellow-900/50 text-yellow-300 border-yellow-700/50',
                      waiting_prejob: 'bg-orange-900/50 text-orange-300 border-orange-700/50',
                      ready_to_schedule: 'bg-cyan-900/50 text-cyan-300 border-cyan-700/50',
                      scheduled: 'bg-blue-900/50 text-blue-300 border-blue-700/50',
                      in_progress: 'bg-indigo-900/50 text-indigo-300 border-indigo-700/50',
                      completed: 'bg-green-900/50 text-green-300 border-green-700/50',
                      invoiced: 'bg-purple-900/50 text-purple-300 border-purple-700/50',
                      paid: 'bg-emerald-900/50 text-emerald-300 border-emerald-700/50',
                    };
                    const statusLabels: Record<string, string> = {
                      new: 'New',
                      docs_sent: 'Docs Sent',
                      waiting_prejob: 'Waiting',
                      ready_to_schedule: 'Ready',
                      scheduled: 'Scheduled',
                      in_progress: 'In Progress',
                      completed: 'Completed',
                      invoiced: 'Invoiced',
                      paid: 'Paid',
                    };
                    const wfStatus = q.workflowStatus || 'new';

                    return (
                      <div
                        key={q.id}
                        className="flex items-center justify-between bg-black/40 rounded px-3 py-2 border border-[#2a2a2a]"
                      >
                        <Link
                          to={`/quotes/${q.id}`}
                          className="text-[#e8d487] underline break-all"
                        >
                          {q.quoteNumber || q.id}
                        </Link>
                        <div className="flex items-center gap-2 ml-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded border ${statusColors[wfStatus] || statusColors.new}`}>
                            {statusLabels[wfStatus] || 'New'}
                          </span>
                          {typeof q.total === "number" && (
                            <span className="text-[11px] text-gray-400">${q.total.toFixed(2)}</span>
                          )}
                        </div>

                        <button
                          type="button"
                          className="text-[11px] text-red-400 ml-3"
                          onClick={async () => {
                            const ok = window.confirm("Delete this quote? This cannot be undone.")
                            if (!ok) return

                            try {
                              await deleteDoc(doc(db, "quotes", q.id))
                              setQuotes((prev) => prev.filter((x) => x.id !== q.id))
                            } catch (err) {
                              console.error(err)
                              useToastStore.getState().show("Failed to delete quote. See console.")
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

                        {/* INVOICES */}
            <div className="card p-5 md:p-6">
              <h2 className="text-sm font-semibold border-l-2 border-[#e8d487] pl-2 mb-2">
                Invoices
              </h2>

              {invoices.length === 0 ? (
                <p className="text-xs text-gray-400">
                  No invoices for this client.
                </p>
              ) : (
                <div className="space-y-2 text-xs">
                  {invoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between bg-black/40 rounded px-3 py-2 border border-[#2a2a2a]"
                    >
                      <Link
                        to={`/invoices/${inv.id}`}
                        className="text-[#e8d487] underline break-all"
                      >
                        {inv.invoiceNumber ?? inv.id}

                      </Link>
                      <div className="text-[11px] text-gray-400 text-right ml-3">
                        <div>{inv.status}</div>
                        {typeof inv.total === "number" && (
                          <div>${inv.total.toFixed(2)}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>


            {/* CONTRACTS */}
            <div className="card p-5 md:p-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold border-l-2 border-[#e8d487] pl-2">
                  Contracts
                </h2>

                <button
                  className="btn-gold text-xs px-3 py-1.5"
                  onClick={() => navigate('/contracts/new')}
                >
                  New Contract
                </button>
              </div>

              {clientContracts.length === 0 ? (
                <p className="text-xs text-gray-400">No contracts yet.</p>
              ) : (
                <div className="space-y-2 text-xs">
                  {clientContracts.map((contract) => (
                    <div
                      key={contract.id}
                      className="flex items-center justify-between bg-black/40 rounded px-3 py-2 border border-[#2a2a2a]"
                    >
                      <Link
  to={`/contracts/${contract.id}`}
  className="text-[#e8d487] underline break-all"
>
  {contract.contractNumber ?? contract.id}
</Link>

                      <div className="text-[11px] text-gray-400 text-right ml-3">
                        <div>{contract.status || "draft"}</div>
                        {typeof contract.totalAmount === "number" && (
                          <div>${contract.totalAmount.toFixed(2)}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SCHEDULE MODAL */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#e8d487]">Schedule Job</h3>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Date Picker */}
              <div>
                <label className="block text-sm text-gray-300 mb-2">Date</label>
                <input
                  type="date"
                  className="input w-full"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                />
              </div>

              {/* Time Dropdown */}
              <div>
                <label className="block text-sm text-gray-300 mb-2">Time</label>
                <select
                  className="input w-full"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                >
                  <option value="">Select a time...</option>
                  {timeOptions.map((time) => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  className="btn-gold flex-1"
                  onClick={async () => {
                    setClient((prev: any) => ({
                      ...prev,
                      scheduledDate: scheduleDate || undefined,
                      scheduledTime: scheduleTime || undefined,
                      workflowStatus: scheduleDate ? 'scheduled' : prev.workflowStatus
                    }));
                    await updateDoc(doc(db, 'clients', client.id), {
                      scheduledDate: scheduleDate || null,
                      scheduledTime: scheduleTime || null,
                      workflowStatus: scheduleDate ? 'scheduled' : client.workflowStatus,
                      updatedAt: Date.now(),
                    });
                    setShowScheduleModal(false);
                    if (scheduleDate) {
                      useToastStore.getState().show('Job scheduled!');
                    }
                  }}
                >
                  Save Schedule
                </button>
                <button
                  className="btn-outline-gold flex-1"
                  onClick={() => setShowScheduleModal(false)}
                >
                  Cancel
                </button>
              </div>

              {/* Clear Schedule */}
              {client.scheduledDate && (
                <button
                  className="w-full text-red-400 text-sm underline mt-2"
                  onClick={async () => {
                    setClient((prev: any) => ({
                      ...prev,
                      scheduledDate: undefined,
                      scheduledTime: undefined,
                    }));
                    await updateDoc(doc(db, 'clients', client.id), {
                      scheduledDate: null,
                      scheduledTime: null,
                      updatedAt: Date.now(),
                    });
                    setShowScheduleModal(false);
                    useToastStore.getState().show('Schedule cleared');
                  }}
                >
                  Clear Schedule
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EDIT CLIENT DRAWER */}
      <ClientDrawer
        open={drawerOpen}
        mode="edit"
        client={client}
        onClose={() => setDrawerOpen(false)}
        onUpdated={(updated) => setClient(updated)}
      />
    </>
  );
}
