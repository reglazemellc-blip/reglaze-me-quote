// ------------------------------------------
// ClientNew.tsx  (UPGRADED FOR NEW CLIENT TYPE)
// ------------------------------------------

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClientsStore } from "@store/useClientsStore";
import { nanoid } from "nanoid";
import { useToastStore } from '@store/useToastStore'


export default function ClientNew() {
  const navigate = useNavigate();
  const upsert = useClientsStore((s) => s.upsert);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const cleaned = value.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX
    if (cleaned.length <= 3) {
      return cleaned;
    } else if (cleaned.length <= 6) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    } else {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
  };

  async function handleSave() {
    if (!name.trim()) {
      useToastStore.getState().show("Name is required");
      return;
    }

    const id = nanoid();
    const now = Date.now();

    await upsert({
      id,
      name: name.trim(),
      phone: phone || "",
      email: email || "",
      address: address || "",
      notes: notes || "",

      // NEW FIELDS — required for your upgraded DB
      photos: [],
      attachments: [],
      conversations: [],
      reminders: [],

      createdAt: now,
      updatedAt: now,
    });

    navigate(`/clients/${id}`);
  }

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <h2 className="text-xl font-semibold text-[#e8d487]">Add New Client</h2>

      <div className="card p-4 space-y-4">
        <label className="text-sm text-[#e8d487]/80">
          Name
          <input
            className="input mt-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <label className="text-sm text-[#e8d487]/80">
          Phone
          <input
            className="input mt-1"
            value={phone}
            onChange={handlePhoneChange}
            placeholder="(315) 555-5555"
            maxLength={14}
          />
        </label>

        <label className="text-sm text-[#e8d487]/80">
          Email
          <input
            className="input mt-1"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="text-sm text-[#e8d487]/80">
          Address
          <input
            className="input mt-1"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </label>

        <label className="text-sm text-[#e8d487]/80">
          Notes
          <textarea
            className="input h-24 mt-1"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        <div className="flex gap-3 pt-2">
          <button className="btn-gold" onClick={handleSave}>
            Save Client
          </button>

          <button
            className="btn-outline-gold"
            onClick={() => navigate("/clients")}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
