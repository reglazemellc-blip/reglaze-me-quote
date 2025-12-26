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

import type { Attachment, AttachmentType, WorkflowStatus, ChecklistItem } from "@db/index";
import { useClientsStore } from "@store/useClientsStore";
import { useContractsStore } from "@store/useContractsStore";
import { useConfigStore } from "@store/useConfigStore";
import { useSettingsStore } from "@store/useSettingsStore";
import ClientDrawer from "@components/ClientDrawer";
import { useToastStore } from '@store/useToastStore'
import { Calendar, FileCheck, FileText, Clock, Send, CheckCircle2, X, Phone, Pencil, Plus, Trash2, RefreshCw } from 'lucide-react'

// Time options for dropdown
const timeOptions = [
  "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM",
  "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
  "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM",
  "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM", "6:00 PM"
];

// File upload validation constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// File validation helper
function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { 
      valid: false, 
      error: `${file.name}: Invalid file type. Only JPG, PNG, and WebP images are allowed.` 
    };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { 
      valid: false, 
      error: `${file.name}: File too large. Maximum size is 10MB (${(file.size / 1024 / 1024).toFixed(1)}MB provided).` 
    };
  }
  return { valid: true };
}

// Default intake checklist questions
const DEFAULT_CHECKLIST_QUESTIONS: ChecklistItem[] = [
  {
    id: "check_0",
    question: "How many tubs/showers?",
    checked: false,
    answer: "",
    answerType: "text",
    answerOptions: [],
  },
  {
    id: "check_1",
    question: "Fiberglass or porcelain?",
    checked: false,
    answer: "",
    answerType: "dropdown",
    answerOptions: ["Fiberglass", "Porcelain", "Other"],
  },
  {
    id: "check_2",
    question: "Current color / desired color?",
    checked: false,
    answer: "",
    answerType: "text",
    answerOptions: [],
  },
  {
    id: "check_3",
    question: "Any chips, cracks, or damage?",
    checked: false,
    answer: "",
    answerType: "text",
    answerOptions: [],
  },
  {
    id: "check_4",
    question: "Has it been refinished before?",
    checked: false,
    answer: "",
    answerType: "dropdown",
    answerOptions: ["Yes", "No", "Not Sure"],
  },
  {
    id: "check_5",
    question: "Timeline - when do they need it done?",
    checked: false,
    answer: "",
    answerType: "text",
    answerOptions: [],
  },
  {
    id: "check_6",
    question: "How did they hear about us?",
    checked: false,
    answer: "",
    answerType: "dropdown",
    answerOptions: ["Google", "Referral", "Repeat", "Other"],
  },
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

type QuoteSummary = {
  id: string;
  quoteNumber?: string | null;
  status?: string;
  workflowStatus?: string;
  total?: number;
  createdAt?: number;
};

// -------------------------------------------------------------
// Call Scripts Card Component
// -------------------------------------------------------------
function CallScriptsCard({ client, settings, isPropertyManager }: { 
  client: any; 
  settings: any; 
  isPropertyManager: boolean;
}) {
  const [activeScript, setActiveScript] = useState<'outbound' | 'inbound' | 'voicemail' | 'text'>('outbound')
  const [copied, setCopied] = useState(false)
  
  const scripts = isPropertyManager 
    ? settings?.propertyManagerScripts 
    : settings?.homeownerScripts

  // Fall back to legacy callScript if no new scripts
  const hasNewScripts = scripts && (scripts.outbound || scripts.inbound || scripts.voicemail || scripts.followUpText)
  
  if (!hasNewScripts && !settings?.callScript) return null

  const getScript = () => {
    if (!hasNewScripts) return settings?.callScript || ''
    switch (activeScript) {
      case 'outbound': return scripts?.outbound || ''
      case 'inbound': return scripts?.inbound || ''
      case 'voicemail': return scripts?.voicemail || ''
      case 'text': return scripts?.followUpText || ''
      default: return ''
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(getScript())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const scriptColors = {
    outbound: { bg: 'from-green-900/30', border: 'border-green-700/50', text: 'text-green-400' },
    inbound: { bg: 'from-blue-900/30', border: 'border-blue-700/50', text: 'text-blue-400' },
    voicemail: { bg: 'from-yellow-900/30', border: 'border-yellow-700/50', text: 'text-yellow-400' },
    text: { bg: 'from-purple-900/30', border: 'border-purple-700/50', text: 'text-purple-400' },
  }

  const colors = scriptColors[activeScript]

  return (
    <div className={`card p-5 md:p-6 bg-gradient-to-r ${colors.bg} to-transparent ${colors.border}`}>
      {/* Header with type indicator */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Phone className={`w-4 h-4 ${colors.text}`} />
          <h2 className={`text-sm font-semibold ${colors.text}`}>
            {isPropertyManager ? '🏢 Property Manager' : '🏠 Homeowner'} Scripts
          </h2>
        </div>
        {client?.phone && (
          <a 
            href={`tel:${client.phone}`}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white rounded-lg text-xs font-medium transition"
          >
            <Phone className="w-3 h-3" />
            Call
          </a>
        )}
      </div>

      {/* Script type tabs */}
      {hasNewScripts && (
        <div className="flex gap-1 mb-3 overflow-x-auto">
          {[
            { key: 'outbound', label: '📤 Outbound', color: 'green' },
            { key: 'inbound', label: '📥 Inbound', color: 'blue' },
            { key: 'voicemail', label: '📱 VM', color: 'yellow' },
            { key: 'text', label: '💬 Text', color: 'purple' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveScript(key as any)}
              className={`px-2 py-1 text-xs rounded whitespace-nowrap transition ${
                activeScript === key
                  ? 'bg-[#e8d487] text-black font-medium'
                  : 'bg-black/30 text-gray-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Script content */}
      <div className="bg-black/30 rounded-lg p-3 relative">
        <pre className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap font-sans">
          {getScript() || 'No script configured'}
        </pre>
        
        {/* Copy button for text scripts */}
        {activeScript === 'text' && getScript() && (
          <button
            onClick={copyToClipboard}
            className="absolute top-2 right-2 px-2 py-1 bg-purple-700 hover:bg-purple-600 text-white rounded text-xs font-medium transition"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 mt-3 flex-wrap">
        {client?.phone && (
          <a 
            href={`sms:${client.phone}${activeScript === 'text' ? `?body=${encodeURIComponent(getScript())}` : ''}`}
            className="flex items-center gap-1 px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white rounded-lg text-xs font-medium transition"
          >
            💬 Text
          </a>
        )}
      </div>
    </div>
  )
}

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
  const [deletingPhoto, setDeletingPhoto] = useState<string | null>(null);
  const [savingChecklist, setSavingChecklist] = useState(false);
  const [deletingClient, setDeletingClient] = useState(false);

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

  // Checklist editing state
  const [editingChecklist, setEditingChecklist] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionType, setNewQuestionType] = useState<'text' | 'dropdown'>('text');
  const [newQuestionOptions, setNewQuestionOptions] = useState<string[]>([]);
  const [newOptionText, setNewOptionText] = useState('');
  const [saveToDefaults, setSaveToDefaults] = useState(false);
  const [syncingFromSettings, setSyncingFromSettings] = useState(false);

  // Settings for call script
  const { settings } = useSettingsStore();

  // -------------------------------------------------------------
  // Sync checklist from settings
  // -------------------------------------------------------------
  const syncChecklistFromSettings = async () => {
    if (!client || !clientId || syncingFromSettings) return;
    
    setSyncingFromSettings(true);
    try {
      const defaultQuestions = settings?.defaultChecklistQuestions || DEFAULT_CHECKLIST_QUESTIONS;
      
      // Create fresh checklist from current defaults, preserving structure
      const newChecklist: ChecklistItem[] = defaultQuestions.map((q, i) => ({
        ...q,
        id: `check_${i}`,
        checked: false,
        answer: '',
      }));
      
      // Update local state
      setClient({ ...client, checklist: newChecklist });
      
      // Save to Firestore
      await updateDoc(doc(db, 'clients', clientId), {
        checklist: newChecklist,
        updatedAt: Date.now(),
      });
      
      useToastStore.getState().show('Checklist synced from settings');
    } catch (error) {
      console.error('Failed to sync checklist:', error);
      useToastStore.getState().show('Failed to sync checklist. Please try again.');
    } finally {
      setSyncingFromSettings(false);
    }
  };

  // -------------------------------------------------------------
  // Helper: Save checklist with error handling
  // -------------------------------------------------------------
  const saveChecklist = async (newChecklist: ChecklistItem[]) => {
    if (!client || savingChecklist) return false;
    
    setSavingChecklist(true);
    try {
      await updateDoc(doc(db, 'clients', client.id), {
        checklist: newChecklist,
        updatedAt: Date.now(),
      });
      return true;
    } catch (error) {
      console.error('Failed to save checklist:', error);
      useToastStore.getState().show('Failed to save changes. Please try again.');
      return false;
    } finally {
      setSavingChecklist(false);
    }
  };

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

        // Initialize checklist - use saved or create from settings defaults
        const savedChecklist: ChecklistItem[] = Array.isArray(data.checklist) ? data.checklist : [];
        const defaultQuestions = useSettingsStore.getState().settings?.defaultChecklistQuestions || DEFAULT_CHECKLIST_QUESTIONS;
        const checklist: ChecklistItem[] = savedChecklist.length > 0 
          ? savedChecklist 
          : defaultQuestions.map((q, i) => ({
              ...q,
              id: `check_${i}`,
              checked: false,
              answer: '',
            }));

        setClient({
          id: snap.id,
          ...data,
          attachments: normalized,
          photos: data.photos || [],
          conversations: data.conversations || [],
          reminders: data.reminders || [],
          checklist,
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
    if (!client || deletingClient) return;
    const ok = window.confirm(
      "Delete this client and ALL their quotes? This cannot be undone."
    );
    if (!ok) return;

    setDeletingClient(true);
    try {
      await remove(client.id);
      useToastStore.getState().show('Client deleted successfully');
      navigate("/clients");
    } catch (err) {
      console.error('Delete client error:', err);
      useToastStore.getState().show('Failed to delete client. Please try again.');
    } finally {
      setDeletingClient(false);
    }
  }

  // -------------------------------------------------------------
  // Photo Upload → attachments[]
  // -------------------------------------------------------------
  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!client || uploadingPhotos) return;

    const files: File[] = Array.from(e.target.files ?? []) as File[];
    if (files.length === 0) return;

    // Validate all files first
    const validationErrors: string[] = [];
    const validFiles: File[] = [];
    
    for (const file of files) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        validationErrors.push(validation.error!);
      } else {
        validFiles.push(file);
      }
    }

    // Show validation errors
    if (validationErrors.length > 0) {
      const errorMsg = validationErrors.join('\n');
      useToastStore.getState().show(errorMsg, 5000);
      // Also show alert for critical file errors
      alert('File Upload Error:\n\n' + errorMsg);
      // If no valid files, reset input and return
      if (validFiles.length === 0) {
        if (photoInputRef.current) {
          photoInputRef.current.value = "";
        }
        return;
      }
    }

    setUploadingPhotos(true);

    try {
      const existing: Attachment[] = client.attachments || [];
      const additions: Attachment[] = [];

      for (const file of validFiles) {
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

      // Use a single update operation instead of multiple updateDoc calls
      // This prevents race conditions when uploading multiple files
      const refDoc = doc(db, "clients", client.id);
      await updateDoc(refDoc, {
        attachments: arrayUnion(...additions),
        tenantId: client.tenantId ?? useConfigStore.getState().activeTenantId,
        updatedAt: Date.now(),
      });

           setClient((prev: any) => ({
        ...prev,
        attachments: [...(prev.attachments || []), ...additions],
      }));

      const successMsg = validFiles.length === files.length
        ? `${files.length} photo(s) uploaded successfully`
        : `${validFiles.length} of ${files.length} photo(s) uploaded (${files.length - validFiles.length} rejected)`;
      useToastStore.getState().show(successMsg);

    } catch (err) {
      console.error('Photo upload error:', err);
      useToastStore.getState().show('Photo upload failed. Please try again.');
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
    if (!client || deletingPhoto) return;

    if (!confirm('Delete this photo?')) return;

    setDeletingPhoto(att.id);

    try {
      if (att.path) {
        const storageRef = ref(storage, att.path);
        await deleteObject(storageRef);
      }

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

      useToastStore.getState().show('Photo deleted successfully');
    } catch (err) {
      console.error('Delete photo error:', err);
      useToastStore.getState().show('Failed to delete photo. Please try again.');
    } finally {
      setDeletingPhoto(null);
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
              className="px-4 py-1.5 text-xs md:text-sm rounded-lg border border-red-500/70 text-red-400 hover:bg-red-500 hover:text-black transition disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleDeleteClient}
              disabled={deletingClient}
            >
              {deletingClient ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-4 md:gap-5">
          {/* LEFT COLUMN --------------------------------------------------- */}
          <div className="space-y-4 md:space-y-5">
            {/* CLIENT CARD */}
            <div className="card p-5 md:p-6">
              <div className="flex flex-col gap-3">
                <div className="text-[11px] tracking-wide text-gray-500 uppercase">
                  Client
                </div>
                <div className="text-lg font-semibold text-[#f5f3da]">
                  {client.name}
                </div>

                <div className="text-sm text-gray-300 space-y-0.5">
                  {client.phone && <div>{client.phone}</div>}
                  {client.address && (
                    <div className="whitespace-pre-line">{client.address}</div>
                  )}
                  {client.email && <div className="text-gray-400">{client.email}</div>}
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
                    className="text-[11px] text-[#e8d487] underline disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhotos}
                  >
                    {uploadingPhotos ? 'Uploading...' : 'Add Photos'}
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
                          className="absolute top-1 right-1 text-red-400 text-[10px] bg-black/70 rounded px-1 disabled:opacity-50"
                          onClick={() => deletePhoto(att)}
                          disabled={deletingPhoto === att.id}
                        >
                          {deletingPhoto === att.id ? '...' : '✕'}
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

            {/* QUOTES - Collapsible */}
            <details className="card p-5 md:p-6 group" open={quotes.length > 0}>
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <h2 className="text-sm font-semibold border-l-2 border-[#e8d487] pl-2 flex items-center gap-2">
                  Quotes ({quotes.length})
                  <span className="text-gray-500 group-open:hidden text-[10px]">+</span>
                  <span className="text-gray-500 hidden group-open:inline text-[10px]">−</span>
                </h2>
                <button
                  className="btn-gold text-sm px-3 py-1.5"
                  onClick={(e) => { e.preventDefault(); navigate(`/quotes/new?clientId=${client.id}`); }}
                >
                  New Quote
                </button>
              </summary>

              <div className="mt-3">
                {loadingQuotes ? (
                  <p className="text-xs text-gray-400">Loading quotes…</p>
                ) : quotes.length === 0 ? (
                  <p className="text-xs text-gray-400">No quotes yet.</p>
                ) : (
                  (() => {
                    // Split quotes into active vs history
                    const finishedStatuses = ['completed', 'invoiced', 'paid'];
                    const activeQuotes = quotes.filter(q => !finishedStatuses.includes(q.workflowStatus || 'new'));
                    const historyQuotes = quotes.filter(q => finishedStatuses.includes(q.workflowStatus || 'new'));
                    
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

                    const QuoteRow = ({ q }: { q: QuoteSummary }) => {
                      const wfStatus = q.workflowStatus || 'new';
                      return (
                        <div
                          key={q.id}
                          className="flex items-center justify-between bg-black/40 rounded px-3 py-2.5 border border-[#2a2a2a] hover:bg-black/60 hover:border-[#e8d487]/30 transition cursor-pointer"
                          onClick={() => navigate(`/quotes/${q.id}`)}
                        >
                          <span className="text-[#e8d487] text-sm font-medium">
                            {q.quoteNumber || q.id}
                          </span>
                          <div className="flex items-center gap-2 ml-3">
                            <span className={`text-[11px] px-2 py-0.5 rounded border ${statusColors[wfStatus] || statusColors.new}`}>
                              {statusLabels[wfStatus] || 'New'}
                            </span>
                            {typeof q.total === "number" && (
                              <span className="text-sm text-gray-300">${q.total.toFixed(2)}</span>
                            )}
                            <button
                              type="button"
                              className="text-sm text-red-400 hover:text-red-300 ml-1"
                              onClick={async (e) => {
                                e.stopPropagation();
                                const ok = window.confirm("Delete this quote? This cannot be undone.")
                                if (!ok) return
                                try {
                                  await deleteDoc(doc(db, "quotes", q.id))
                                  setQuotes((prev) => prev.filter((x) => x.id !== q.id))
                                } catch (err) {
                                  console.error(err)
                                  useToastStore.getState().show("Failed to delete quote.")
                                }
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    };

                    return (
                      <div className="space-y-4 text-xs">
                        {/* ACTIVE JOBS - Always visible, prominent */}
                        {activeQuotes.length > 0 && (
                          <div>
                            <div className="text-[11px] text-[#e8d487] font-medium mb-2 flex items-center gap-2">
                              <span className="w-2 h-2 bg-[#e8d487] rounded-full animate-pulse"></span>
                              Active Jobs ({activeQuotes.length})
                            </div>
                            <div className="space-y-2">
                              {activeQuotes.map((q) => <QuoteRow key={q.id} q={q} />)}
                            </div>
                          </div>
                        )}

                        {/* NO ACTIVE JOBS message */}
                        {activeQuotes.length === 0 && historyQuotes.length > 0 && (
                          <div className="text-gray-500 text-[11px] py-2">
                            No active jobs — all work completed
                          </div>
                        )}

                        {/* HISTORY - Collapsible */}
                        {historyQuotes.length > 0 && (
                          <details className="group/history">
                            <summary className="text-[11px] text-gray-400 cursor-pointer hover:text-gray-300 transition list-none flex items-center gap-2">
                              <span className="group-open/history:hidden">+</span>
                              <span className="hidden group-open/history:inline">−</span>
                              History ({historyQuotes.length} completed)
                            </summary>
                            <div className="space-y-2 mt-2 pl-4 border-l border-gray-700">
                              {historyQuotes.map((q) => <QuoteRow key={q.id} q={q} />)}
                            </div>
                          </details>
                        )}
                      </div>
                    );
                  })()
                )}
              </div>
            </details>

            {/* INVOICES - Collapsible */}
            <details className="card p-5 md:p-6 group" open={invoices.length > 0}>
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <h2 className="text-sm font-semibold border-l-2 border-[#e8d487] pl-2 flex items-center gap-2">
                  Invoices ({invoices.length})
                  <span className="text-gray-500 group-open:hidden text-[10px]">+</span>
                  <span className="text-gray-500 hidden group-open:inline text-[10px]">−</span>
                </h2>
              </summary>

              <div className="mt-3">
                {invoices.length === 0 ? (
                  <p className="text-sm text-gray-400">
                    No invoices for this client.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {invoices.map((inv) => (
                      <Link
                        key={inv.id}
                        to={`/invoices/${inv.id}`}
                        className="flex items-center justify-between bg-black/40 rounded px-3 py-2.5 border border-[#2a2a2a] hover:bg-black/60 hover:border-[#e8d487]/30 transition cursor-pointer"
                      >
                        <span className="text-[#e8d487] text-sm font-medium">
                          {inv.invoiceNumber ?? inv.id}
                        </span>
                        <div className="text-sm text-gray-300 text-right ml-3">
                          <div>{inv.status}</div>
                          {typeof inv.total === "number" && (
                            <div>${inv.total.toFixed(2)}</div>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </details>

            {/* CONTRACTS - Collapsible */}
            <details className="card p-5 md:p-6 group" open={clientContracts.length > 0}>
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <h2 className="text-sm font-semibold border-l-2 border-[#e8d487] pl-2 flex items-center gap-2">
                  Contracts ({clientContracts.length})
                  <span className="text-gray-500 group-open:hidden text-[10px]">+</span>
                  <span className="text-gray-500 hidden group-open:inline text-[10px]">−</span>
                </h2>
                <button
                  className="btn-gold text-sm px-3 py-1.5"
                  onClick={(e) => { e.preventDefault(); navigate('/contracts/new'); }}
                >
                  New
                </button>
              </summary>

              <div className="mt-3">
                {clientContracts.length === 0 ? (
                  <p className="text-sm text-gray-400">No contracts yet.</p>
                ) : (
                  <div className="space-y-2">
                    {clientContracts.map((contract) => (
                      <Link
                        key={contract.id}
                        to={`/contracts/${contract.id}`}
                        className="flex items-center justify-between bg-black/40 rounded px-3 py-2.5 border border-[#2a2a2a] hover:bg-black/60 hover:border-[#e8d487]/30 transition cursor-pointer"
                      >
                        <span className="text-[#e8d487] text-sm font-medium">
                          {contract.contractNumber ?? contract.id}
                        </span>
                        <div className="text-sm text-gray-300 text-right ml-3">
                          <div>{contract.status || "draft"}</div>
                          {typeof contract.totalAmount === "number" && (
                            <div>${contract.totalAmount.toFixed(2)}</div>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </details>
          </div>

          {/* RIGHT COLUMN -------------------------------------------------- */}
          <div className="space-y-4 md:space-y-5">
            {/* CALL SCRIPT */}
            {/* CALL SCRIPTS */}
            {(settings?.homeownerScripts || settings?.propertyManagerScripts || settings?.callScript) && (
              <CallScriptsCard 
                client={client} 
                settings={settings} 
                isPropertyManager={!!client?.companyId}
              />
            )}

            {/* INTAKE CHECKLIST */}
            <details className="card p-5 md:p-6" open>
              <summary className="flex items-center justify-between mb-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                <h2 className="text-sm font-semibold border-l-2 border-[#e8d487] pl-2">
                  Intake Checklist
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (confirm('Replace this checklist with current settings defaults? This will erase all current answers and questions.')) {
                        syncChecklistFromSettings();
                      }
                    }}
                    disabled={syncingFromSettings}
                    className="text-xs flex items-center gap-1 px-2 py-1 rounded transition text-gray-400 hover:text-[#e8d487] hover:bg-black/40 disabled:opacity-50"
                    title="Sync from Settings"
                  >
                    <RefreshCw className={`w-3 h-3 ${syncingFromSettings ? 'animate-spin' : ''}`} />
                    Sync
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setEditingChecklist(!editingChecklist);
                    }}
                    className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition ${
                      editingChecklist 
                        ? 'bg-[#e8d487] text-black' 
                        : 'text-[#e8d487] hover:bg-black/40'
                    }`}
                  >
                    <Pencil className="w-3 h-3" />
                    {editingChecklist ? 'Done' : 'Edit'}
                  </button>
                </div>
              </summary>

              <div className="space-y-3">
                {(client.checklist || []).map((item: ChecklistItem, idx: number) => (
                  <div 
                    key={item.id} 
                    className={`p-3 rounded-lg border transition ${
                      item.checked 
                        ? 'bg-green-900/20 border-green-700/50' 
                        : 'bg-black/30 border-gray-700/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {!editingChecklist && (
                        <button
                          type="button"
                          className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                            item.checked
                              ? 'bg-green-600 border-green-600 text-white'
                              : 'border-gray-500 hover:border-[#e8d487]'
                          }`}
                          onClick={async () => {
                            const newChecklist = [...(client.checklist || [])];
                            newChecklist[idx] = {
                              ...item,
                              checked: !item.checked,
                              checkedAt: !item.checked ? Date.now() : undefined,
                            };
                            setClient({ ...client, checklist: newChecklist });
                            await saveChecklist(newChecklist);
                          }}
                        >
                          {item.checked && <span className="text-xs">✓</span>}
                        </button>
                      )}
                      
                      <div className="flex-1">
                        {editingChecklist ? (
                          <input
                            type="text"
                            className="w-full bg-black/40 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:border-[#e8d487] focus:outline-none font-medium"
                            value={item.question}
                            onChange={(e) => {
                              const newChecklist = [...(client.checklist || [])];
                              newChecklist[idx] = { ...item, question: e.target.value };
                              setClient({ ...client, checklist: newChecklist });
                            }}
                            onBlur={async () => {
                              await saveChecklist(client.checklist);
                            }}
                          />
                        ) : (
                          <>
                            <div className={`text-sm font-medium ${item.checked ? 'text-green-400' : 'text-gray-200'}`}>
                              {item.question}
                            </div>
                            {/* Answer input - dropdown if options exist, otherwise text */}
                            {(() => {
                              // Get answer options from item or from settings defaults
                              const answerOptions = item.answerOptions || 
                                settings?.defaultChecklistAnswerOptions?.[item.question] || 
                                [];
                              const hasOptions = answerOptions.length > 0;
                              const isOther = item.answer === 'Other' || 
                                (item.answer && !answerOptions.includes(item.answer) && item.answer !== '');
                              
                              if (hasOptions) {
                                return (
                                  <div className="mt-2 space-y-2">
                                    <select
                                      className="w-full bg-black/40 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:border-[#e8d487] focus:outline-none"
                                      value={isOther ? 'Other' : (item.answer || '')}
                                      onChange={async (e) => {
                                        const val = e.target.value;
                                        const newChecklist = [...(client.checklist || [])];
                                        if (val === 'Other') {
                                          // Set to "Other" and clear for custom input
                                          newChecklist[idx] = { ...item, answer: 'Other' };
                                        } else {
                                          newChecklist[idx] = { ...item, answer: val };
                                        }
                                        setClient({ ...client, checklist: newChecklist });
                                        await saveChecklist(newChecklist);
                                      }}
                                    >
                                      <option value="">Select answer...</option>
                                      {answerOptions.map((opt: string) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                      ))}
                                    </select>
                                    {/* Show text input if "Other" is selected or answer doesn't match options */}
                                    {isOther && (
                                      <input
                                        type="text"
                                        className="w-full bg-black/40 border border-yellow-600/50 rounded px-2 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:border-[#e8d487] focus:outline-none"
                                        placeholder="Enter custom answer..."
                                        value={item.answer === 'Other' ? '' : (item.answer || '')}
                                        onChange={(e) => {
                                          const newChecklist = [...(client.checklist || [])];
                                          newChecklist[idx] = { ...item, answer: e.target.value || 'Other' };
                                          setClient({ ...client, checklist: newChecklist });
                                        }}
                                        onBlur={async () => {
                                          await saveChecklist(client.checklist);
                                        }}
                                        autoFocus
                                      />
                                    )}
                                  </div>
                                );
                              }
                              
                              // No options - show regular text input
                              return (
                                <input
                                  type="text"
                                  className="mt-2 w-full bg-black/40 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:border-[#e8d487] focus:outline-none"
                                  placeholder="Answer / notes..."
                                  value={item.answer || ''}
                                  onChange={(e) => {
                                    const newChecklist = [...(client.checklist || [])];
                                    newChecklist[idx] = { ...item, answer: e.target.value };
                                    setClient({ ...client, checklist: newChecklist });
                                  }}
                                  onBlur={async () => {
                                    await saveChecklist(client.checklist);
                                  }}
                                />
                              );
                            })()}
                          </>
                        )}
                      </div>
                      
                      {editingChecklist && (
                        <button
                          type="button"
                          className="mt-1 p-1 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition"
                          title="Delete question"
                          onClick={async () => {
                            const newChecklist = (client.checklist || []).filter((_: ChecklistItem, i: number) => i !== idx);
                            setClient({ ...client, checklist: newChecklist });
                            await saveChecklist(newChecklist);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Add new question (when editing) */}
                {editingChecklist && (
                  <div className="mt-3 p-3 bg-black/20 rounded-lg border border-gray-700/50 space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="flex-1 bg-black/40 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-[#e8d487] focus:outline-none"
                        placeholder="Add a new question..."
                        value={newQuestionText}
                        onChange={(e) => setNewQuestionText(e.target.value)}
                      />
                    </div>
                    
                    {newQuestionText.trim() && (
                      <>
                        <div className="flex gap-2">
                          <label className="text-xs text-gray-400">Answer Type:</label>
                          <select
                            className="flex-1 bg-black/40 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 focus:border-[#e8d487] focus:outline-none"
                            value={newQuestionType}
                            onChange={(e) => setNewQuestionType(e.target.value as 'text' | 'dropdown')}
                          >
                            <option value="text">Text</option>
                            <option value="dropdown">Dropdown</option>
                          </select>
                        </div>
                        
                        {newQuestionType === 'dropdown' && (
                          <div className="space-y-2">
                            <label className="text-xs text-gray-400">Dropdown Options:</label>
                            <div className="space-y-1">
                              {newQuestionOptions.map((opt, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-xs">
                                  <span className="flex-1 bg-black/40 px-2 py-1 rounded text-gray-200">{opt}</span>
                                  <button
                                    type="button"
                                    onClick={() => setNewQuestionOptions(newQuestionOptions.filter((_, i) => i !== idx))}
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                className="flex-1 bg-black/40 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 placeholder-gray-400 focus:border-[#e8d487] focus:outline-none"
                                placeholder="Add option..."
                                value={newOptionText}
                                onChange={(e) => setNewOptionText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && newOptionText.trim()) {
                                    setNewQuestionOptions([...newQuestionOptions, newOptionText.trim()]);
                                    setNewOptionText('');
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (newOptionText.trim()) {
                                    setNewQuestionOptions([...newQuestionOptions, newOptionText.trim()]);
                                    setNewOptionText('');
                                  }
                                }}
                                disabled={!newOptionText.trim()}
                                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded text-xs transition disabled:opacity-50"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        )}
                        
                        <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={saveToDefaults}
                            onChange={(e) => setSaveToDefaults(e.target.checked)}
                            className="w-3 h-3 rounded border-gray-600 bg-black/40 text-[#e8d487] focus:ring-[#e8d487] focus:ring-offset-0"
                          />
                          Also save to default questions for new clients
                        </label>
                        
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="flex-1 px-3 py-2 bg-[#e8d487] text-black rounded font-medium text-sm hover:bg-[#ffd700] transition disabled:opacity-50"
                            onClick={async () => {
                              const newItem: ChecklistItem = {
                                id: `check_${Date.now()}`,
                                question: newQuestionText.trim(),
                                checked: false,
                                answer: '',
                                answerType: newQuestionType,
                                answerOptions: newQuestionType === 'dropdown' ? newQuestionOptions : [],
                              };
                              const newChecklist = [...(client.checklist || []), newItem];
                              setClient({ ...client, checklist: newChecklist });
                              
                              // Save to defaults if checkbox is checked
                              if (saveToDefaults && settings) {
                                try {
                                  const currentDefaults = settings.defaultChecklistQuestions || [];
                                  const questionExists = currentDefaults.some((q) => 
                                    typeof q === 'string' ? q === newQuestionText.trim() : q.question === newQuestionText.trim()
                                  );
                                  if (!questionExists) {
                                    await useSettingsStore.getState().update({
                                      defaultChecklistQuestions: [...currentDefaults, newItem]
                                    });
                                  }
                                } catch (error) {
                                  console.error('Failed to save to defaults:', error);
                                  useToastStore.getState().show('Question added but failed to save to defaults');
                                }
                                setSaveToDefaults(false);
                              }
                              
                              const saved = await saveChecklist(newChecklist);
                              if (saved) {
                                setNewQuestionText('');
                                setNewQuestionType('text');
                                setNewQuestionOptions([]);
                              }
                            }}
                            disabled={savingChecklist}
                          >
                            {savingChecklist ? 'Saving...' : 'Add Question'}
                          </button>
                          <button
                            type="button"
                            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded text-sm transition"
                            onClick={() => {
                              setNewQuestionText('');
                              setNewQuestionType('text');
                              setNewQuestionOptions([]);
                              setNewOptionText('');
                              setSaveToDefaults(false);
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Progress indicator */}
              {client.checklist && client.checklist.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-700/50">
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>
                      {client.checklist.filter((c: ChecklistItem) => c.checked).length} of {client.checklist.length} completed
                    </span>
                    <div className="w-24 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#e8d487] transition-all"
                        style={{ 
                          width: `${(client.checklist.filter((c: ChecklistItem) => c.checked).length / client.checklist.length) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </details>
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
                  className="btn-gold flex-1 disabled:opacity-50"
                  disabled={savingChecklist}
                  onClick={async () => {
                    if (!scheduleDate) {
                      useToastStore.getState().show('Please select a date', 3000);
                      alert('Please select a date');
                      return;
                    }

                    // Validate date is not in the past
                    const selectedDateStr = scheduleDate; // format: YYYY-MM-DD
                    const todayStr = new Date().toISOString().split('T')[0];
                    
                    if (selectedDateStr < todayStr) {
                      const errorMsg = 'Scheduled date cannot be in the past';
                      useToastStore.getState().show(errorMsg, 4000);
                      alert(errorMsg);
                      return;
                    }

                    setSavingChecklist(true);
                    try {
                      setClient((prev: any) => ({
                        ...prev,
                        scheduledDate: scheduleDate,
                        scheduledTime: scheduleTime || undefined,
                        workflowStatus: 'scheduled'
                      }));
                      await updateDoc(doc(db, 'clients', client.id), {
                        scheduleDate,
                        scheduledTime: scheduleTime || null,
                        workflowStatus: 'scheduled',
                        updatedAt: Date.now(),
                      });
                      setShowScheduleModal(false);
                      useToastStore.getState().show('Job scheduled successfully!');
                    } catch (error) {
                      console.error('Failed to schedule job:', error);
                      useToastStore.getState().show('Failed to schedule job. Please try again.');
                    } finally {
                      setSavingChecklist(false);
                    }
                  }}
                >
                  {savingChecklist ? 'Saving...' : 'Save Schedule'}
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
