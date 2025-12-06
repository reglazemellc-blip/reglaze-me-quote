import React, { useRef, useState } from "react";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

import { storage } from "../firebase";
import type { Attachment } from "@db/index";
import { useToastStore } from "@store/useToastStore";


function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

type Props = {
  attachments: Attachment[];
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;
  quoteId: string; // always provided by QuoteEditor (even for new quotes)
};

export default function PhotoUpload({
  attachments,
  setAttachments,
  quoteId,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  // -------------------------------------------------------------
  // Handle File Upload
  // -------------------------------------------------------------
  const handleFiles = async (files: FileList | null) => {
    if (!files) return;

    if (!quoteId) {
      useToastStore.getState().show("Please save or create the quote first.");

      return;
    }

    const list = Array.from(files);
    if (!list.length) return;

    setUploading(true);

    try {
      const newItems: Attachment[] = [];

      for (const file of list) {
        const path = `quotes/${quoteId}/attachments/${Date.now()}-${file.name}`;
        const ref = storageRef(storage, path);

        // Upload file
        await uploadBytes(ref, file);

        // Get public URL
        const url = await getDownloadURL(ref);

        newItems.push({
          id: createId(),
          name: file.name,
          url,
          type: "photo",
          createdAt: Date.now(),
          path,
        });
      }

      if (newItems.length) {
        setAttachments((prev) => [...prev, ...newItems]);
      }
    } catch (err) {
      console.error("Upload failed:", err);
      useToastStore.getState().show("Failed to upload photos.");

    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  // -------------------------------------------------------------
  // Delete attachment (UI + Storage, Firestore will sync on save)
  // -------------------------------------------------------------
  const handleDelete = async (att: Attachment) => {
    try {
      if (att.path) {
        const ref = storageRef(storage, att.path);
        await deleteObject(ref);
      }
    } catch (err) {
      console.error("Delete failed:", err);
      useToastStore.getState().show("Failed to delete photo from storage.");

    } finally {
      setAttachments((prev) => prev.filter((x) => x.id !== att.id));
    }
  };

  return (
    <div className="card p-4 space-y-3">
      <h2 className="text-lg font-semibold border-l-2 border-[#e8d487] pl-2">
        Photos
      </h2>

      {/* Hidden input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Trigger button */}
      <button
        type="button"
        className="btn-outline-gold text-sm"
        onClick={() => inputRef.current?.click()}
      >
        + Upload Photos
      </button>

      {uploading && (
        <div className="text-yellow-500 text-sm mt-1">Uploading…</div>
      )}

      {/* Thumbnails */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
        {attachments.map((att) => (
          <div
            key={att.id}
            className="relative bg-black/40 border border-[#2a2a2a] rounded-lg p-2"
          >
            <img
              src={att.url}
              alt={att.name}
              className="w-full h-32 object-cover rounded"
            />

            <button
              type="button"
              className="absolute top-1 right-1 bg-red-600 text-white text-xs px-1 rounded"
              onClick={() => handleDelete(att)}
            >
              X
            </button>

            <div className="text-xs mt-1 text-gray-400 truncate">
              {att.name}
            </div>
          </div>
        ))}

        {attachments.length === 0 && !uploading && (
          <div className="col-span-full text-center text-gray-500 text-sm">
            No photos uploaded yet.
          </div>
        )}
      </div>
    </div>
  );
}
