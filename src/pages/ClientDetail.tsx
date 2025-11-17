import React, { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";

import { db, storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

type ConversationChannel = "call" | "text" | "email" | "in_person" | "other";

type ConversationEntry = {
  id: string;
  message: string;
  channel: ConversationChannel;
  createdAt: number;
  attachments?: { url: string; name: string }[];
};

export default function ClientDetail() {
  const { id } = useParams();
  const clientId = id ?? "";

  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<any>(null);

  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  // Conversation composer
const [newChannel, setNewChannel] = useState<ConversationChannel>("text");
const [newMessage, setNewMessage] = useState("");

// File upload busy flag
const [convUploading, setConvUploading] = useState(false);

// Edit mode
const [editingId, setEditingId] = useState<string | null>(null);
const [editingText, setEditingText] = useState("");
const [editingChannel, setEditingChannel] =
  useState<ConversationChannel>("text");


  // -------------------------------------------------------------
  // Load client
  // -------------------------------------------------------------
  useEffect(() => {
    if (!clientId) return;

    async function load() {
      try {
        const refDoc = doc(db, "clients", clientId);
        const snap = await getDoc(refDoc);

        if (!snap.exists()) {
          alert("Client not found.");
          return;
        }

        const data = snap.data();
        setClient({
          id: snap.id,
          ...data,
          photos: data.photos || [],
          attachments: data.attachments || [],
          conversations: data.conversations || [],
          reminders: data.reminders || [],
          quotes: data.quotes || [],
        });
      } catch (err) {
        console.error(err);
        alert("Failed to load client.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [clientId]);

  // -------------------------------------------------------------
  // Photos
  // -------------------------------------------------------------
  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!client) return;

    const files: File[] = Array.from(e.target.files ?? []) as File[];
    if (files.length === 0) return;

    setUploadingPhotos(true);

    try {
      const uploaded: string[] = [];

      for (const file of files) {
        const storageRef = ref(
          storage,
          `clients/${client.id}/photos/${Date.now()}_${file.name}`
        );

        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        uploaded.push(url);
      }

      const refDoc = doc(db, "clients", client.id);
      await updateDoc(refDoc, {
        photos: arrayUnion(...uploaded),
      });

      setClient((prev: any) => ({
        ...prev,
        photos: [...(prev.photos || []), ...uploaded],
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

  async function deletePhoto(url: string) {
    if (!client) return;

    const refDoc = doc(db, "clients", client.id);
    await updateDoc(refDoc, {
      photos: arrayRemove(url),
    });

    setClient((prev: any) => ({
      ...prev,
      photos: (prev.photos || []).filter((p: string) => p !== url),
    }));
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

  // add to Firestore
  const existing: ConversationEntry[] = client.conversations || [];
  const updatedList = [...existing, entry];

  await updateDoc(refDoc, {
    conversations: updatedList,
  });

  // update local state
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

    // UPDATED CONVERSATION
    const updatedConv: ConversationEntry = {
      ...conv,
      attachments: [...(conv.attachments || []), { url, name: file.name }],
    };

    // Replace that conversation in the array
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
  const quotes: string[] = client.quotes || [];
  const attachments = client.attachments || [];

  return (
    <div className="space-y-6 text-[#f5f3da]">
      {/* CLIENT CARD (like your screenshot) */}
      <div className="card p-6">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-sm text-gray-400 mb-1">Client</div>
            <div className="text-xl font-semibold">{client.name}</div>

            <div className="mt-3 text-sm text-gray-300 space-y-1">
              <div>{client.phone}</div>
              <div>{client.email}</div>
              <div className="whitespace-pre-line">{client.address}</div>
            </div>

            <div className="mt-4 text-sm text-gray-400">Notes</div>
          </div>

          <button className="text-red-500 text-sm">Delete</button>
        </div>

        {/* Photos line + Add Photos link */}
        <div className="mt-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Photos</div>
            {client.photos.length === 0 && (
              <div className="text-sm text-gray-400">No photos uploaded.</div>
            )}
          </div>

          <button
            type="button"
            className="text-gold text-sm underline"
            onClick={() => photoInputRef.current?.click()}
          >
            Add Photos
          </button>
        </div>

        {/* hidden input for actual upload */}
        <input
          ref={photoInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handlePhotoUpload}
        />

        {uploadingPhotos && (
          <div className="text-xs text-gray-400 mt-2">Uploading…</div>
        )}

        {client.photos.length > 0 && (
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
            {client.photos.map((url: string) => (
              <div key={url} className="relative group">
                <img src={url} className="rounded border border-gray-600" />
                <button
                  className="absolute top-1 right-1 text-red-400 text-xs"
                  onClick={() => deletePhoto(url)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ATTACHMENTS CARD */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold border-l-2 border-gold pl-2">
          Attachments
        </h2>

        {attachments.length === 0 ? (
          <p className="text-sm text-gray-400 mt-2">No attachments.</p>
        ) : (
          <ul className="mt-3 space-y-1 text-sm">
            {attachments.map((a: any, idx: number) => (
              <li key={idx}>
                <a
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-gold underline"
                >
                  {a.name || "Attachment"}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* CONVERSATIONS CARD */}
      {/* CONVERSATIONS */}
<div className="card p-6 space-y-4">
  <h2 className="text-lg font-semibold border-l-2 border-gold pl-2">
    Conversations
  </h2>

  {/* Input row (channel + textarea + button) */}
  <div className="space-y-2">
    <div className="flex flex-col md:flex-row md:items-center gap-2">
      <select
        className="input md:w-40"
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
        className="input flex-1 h-20"
        placeholder="Paste conversation or notes…"
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
      />
    </div>

    <button className="btn-gold" onClick={addConversation}>
      Add Conversation
    </button>
  </div>

  {convUploading && (
    <div className="text-xs text-gray-400">Uploading file…</div>
  )}

  {/* List */}
  <div className="space-y-3 mt-2">
    {conversations.length === 0 && (
      <p className="text-sm text-gray-400">No conversation logs.</p>
    )}

    {conversations.map((c) => (
      <div
        key={c.id}
        className="p-3 bg-black/40 rounded border border-gray-700 text-sm"
      >
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1">
            <div className="text-xs text-gray-400">
              {new Date(c.createdAt).toLocaleString()} — {c.channel}
            </div>

            {editingId === c.id ? (
              <div className="mt-2 space-y-2">
                <select
                  className="input w-40 text-xs"
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
                  className="input w-full h-20"
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                />

                <div className="flex gap-2">
                  <button
                    className="btn-gold text-xs px-3"
                    onClick={saveEditConversation}
                  >
                    Save
                  </button>
                  <button
                    className="btn-outline-gold text-xs px-3"
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

          <div className="flex flex-col gap-1 items-end">
            <button
              className="text-xs text-gray-300"
              onClick={() => startEditConversation(c)}
            >
              ✎ Edit
            </button>
            <button
              className="text-xs text-red-400"
              onClick={() => deleteConversation(c)}
            >
              Delete
            </button>
          </div>
        </div>

        {/* attachments */}
        {(c.attachments || []).length > 0 && (
          <div className="mt-2 space-y-1">
            {c.attachments!.map((a: any, idx: number) => (
              <a
                key={idx}
                href={a.url}
                target="_blank"
                rel="noreferrer"
                className="block text-gold underline text-xs"
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
            className="text-xs"
          />
        </div>
      </div>
    ))}
  </div>
</div>


      {/* REMINDERS CARD */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold border-l-2 border-gold pl-2">
          Reminders
        </h2>

        {reminders.length === 0 ? (
          <p className="text-sm text-gray-400 mt-2">No reminders.</p>
        ) : (
          <ul className="mt-3 space-y-1 text-sm">
            {reminders.map((r: any) => (
              <li key={r.id}>{r.note || "Reminder"}</li>
            ))}
          </ul>
        )}
      </div>

      {/* QUOTES CARD */}
      <div className="card p-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold border-l-2 border-gold pl-2">
            Quotes
          </h2>

          <Link
            to={`/quotes/new?clientId=${client.id}`}
            className="btn-gold text-sm px-4"
          >
            New Quote
          </Link>
        </div>

        {quotes.length === 0 ? (
          <p className="text-sm text-gray-400">No quotes yet.</p>
        ) : (
          <div className="space-y-2 text-sm">
            {quotes.map((qid) => (
              <div
                key={qid}
                className="flex items-center justify-between bg-black/40 rounded px-3 py-2 border border-gray-700"
              >
                <Link
                  to={`/quotes/${qid}`}
                  className="text-gold underline break-all"
                >
                  {qid}
                </Link>
                {/* You already had a Delete in your old UI; we can wire it later */}
                <span className="text-red-500 text-xs cursor-pointer">
                  Delete
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
