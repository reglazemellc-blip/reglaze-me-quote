// src/pages/ClientDetail.tsx

import React, { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db, storage } from "../firebase";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

import type { Attachment, AttachmentType } from "@db/index";
import { useClientsStore } from "@store/useClientsStore";
import ClientDrawer from "@components/ClientDrawer";

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

  // Edit drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);

  // -------------------------------------------------------------
  // Load client + their quotes
  // -------------------------------------------------------------
  useEffect(() => {
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

        const normalized: Attachment[] = rawAttachments.map((a) => ({
          id: String(a.id ?? createId()),
          name: String(a.name ?? "Attachment"),
          url: String(a.url ?? ""),
          type: (a.type as AttachmentType) || "photo",
          createdAt: Number(a.createdAt ?? Date.now()),
          path: String(a.path ?? ""),
          conversationId: a.conversationId ?? undefined,
        }));

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
          query(collection(db, "quotes"), where("clientId", "==", clientId))
        );

        const qList: QuoteSummary[] = qSnap.docs.map((d) => {
          const qd = d.data() as any;
          return {
            id: d.id,
            quoteNumber: qd.quoteNumber ?? null,
            status: qd.status ?? "pending",
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
      } catch (err) {
        console.error(err);
        alert("Failed to load client.");
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
      alert("Failed to delete client.");
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
        const path = `clients/${client.id}/attachments/${Date.now()}_${file.name}`;
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

      const updatedAttachments = [...existing, ...additions];

      const refDoc = doc(db, "clients", client.id);
      await updateDoc(refDoc, {
        attachments: updatedAttachments,
      });

      setClient((prev: any) => ({
        ...prev,
        attachments: updatedAttachments,
      }));
    } catch (err) {
      console.error(err);
      alert("Failed to upload photo.");
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
      alert("Failed to delete photo.");
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
      alert("Failed to upload file.");
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
                  {quotes.map((q) => (
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
                      <div className="text-[11px] text-gray-400 text-right ml-3">
                        <div>{q.status || "pending"}</div>
                        {typeof q.total === "number" && (
                          <div>${q.total.toFixed(2)}</div>
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
