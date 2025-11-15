import { useParams, Link, useNavigate } from "react-router-dom";
import { useClientsStore } from "@store/useClientsStore";
import { useQuotesStore } from "@store/useQuotesStore";
import { useEffect, useRef, useState } from "react";
import InlineEditableText from "@components/InlineEditableText";
import ClientNew from "@pages/ClientNew";

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { clients, init: initClients, upsert, remove } = useClientsStore();
  const { quotes, init: initQuotes, remove: removeQuote } = useQuotesStore();

  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    initClients();
    initQuotes();
  }, [initClients, initQuotes]);

  if (id === "new") return <ClientNew />;

  const client = clients.find((c) => c.id === id);
  if (!client)
    return <div className="text-gray-400 p-4">Client not found.</div>;

  const c = client;

  const clientQuotes = quotes.filter((q) => q.clientId === c.id);
  const recent = clientQuotes.slice(0, 5);

  async function handleDeleteClient() {
    const count = clientQuotes.length;
    const msg =
      count > 0
        ? `Delete this client AND ${count} quote(s)?`
        : "Delete this client?";
    if (!confirm(msg)) return;

    await remove(c.id);
    navigate("/clients");
  }

  async function handleDeleteQuote(id: string) {
    if (!confirm("Delete this quote?")) return;
    await removeQuote(id);
  }

  return (
    <div className="space-y-6 p-4 max-w-4xl mx-auto">
      {/* CLIENT INFO */}
      <div className="card p-4 space-y-4 relative">
        <button
          onClick={handleDeleteClient}
          className="absolute top-3 right-4 text-red-500 hover:text-red-400 text-sm"
        >
          Delete
        </button>

        <h2 className="text-lg font-semibold border-l-2 border-[#e8d487] pl-2 text-[#f5f3da]">
          Client
        </h2>

        <InlineEditableText
          value={c.name}
          onSave={(v) => upsert({ ...c, name: v })}
          className="text-[#f5f3da] text-xl"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[#e5e3c5]">
          <InlineEditableText
            value={c.phone || ""}
            onSave={(v) => upsert({ ...c, phone: v })}
            placeholder="Phone"
          />
          <InlineEditableText
            value={c.email || ""}
            onSave={(v) => upsert({ ...c, email: v })}
            placeholder="Email"
          />
          <InlineEditableText
            value={c.address || ""}
            onSave={(v) => upsert({ ...c, address: v })}
            placeholder="Address"
          />
          <InlineEditableText
            value={c.notes || ""}
            onSave={(v) => upsert({ ...c, notes: v })}
            placeholder="Notes"
          />
        </div>

        {/* PHOTOS */}
        <div className="mt-2">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium text-[#f5f3da]">Photos</div>

            <button
              className="text-sm underline text-[#e8d487]"
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? "Uploading…" : "Add Photos"}
            </button>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={async (e) => {
              const files = Array.from(e.target.files || []);
              if (!files.length) return;

              setUploading(true);
              const urls: string[] = [];

              for (const f of files) {
                const base64 = await fileToDataUrl(f);
                urls.push(base64);
              }

              await upsert({
                ...c,
                photos: [...(c.photos || []), ...urls],
              });

              setUploading(false);
            }}
          />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(c.photos || []).map((src, i) => (
              <div key={i} className="relative">
                <img src={src} className="w-full h-24 object-cover rounded" />
                <button
                  onClick={async () => {
                    const next = (c.photos || []).filter(
                      (_, idx) => idx !== i
                    );
                    await upsert({ ...c, photos: next });
                  }}
                  className="absolute top-1 right-1 bg-white/80 px-1 rounded text-xs"
                >
                  ✕
                </button>
              </div>
            ))}

            {!(c.photos || []).length && (
              <div className="text-gray-500">No photos uploaded.</div>
            )}
          </div>
        </div>
      </div>

      {/* ATTACHMENTS */}
      <div className="card p-4 space-y-3">
        <h2 className="text-lg font-semibold text-[#f5f3da]">
          Attachments
        </h2>

        {(c.attachments ?? []).length === 0 ? (
          <div className="text-gray-400 text-sm">No attachments.</div>
        ) : (
          <ul className="space-y-2">
            {c.attachments!.map((a) => (
              <li
                key={a.id}
                className="flex justify-between items-center text-[#e5e3c5]"
              >
                <div>
                  <div className="font-medium">{a.name}</div>
                  <div className="text-xs text-gray-400">{a.type}</div>
                </div>

                <a
                  href={a.url}
                  target="_blank"
                  className="text-[#e8d487] underline text-sm"
                >
                  View
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* CONVERSATIONS */}
      <div className="card p-4 space-y-3">
        <h2 className="text-lg font-semibold text-[#f5f3da]">
          Conversations
        </h2>

        {(c.conversations ?? []).length === 0 ? (
          <div className="text-gray-400 text-sm">No conversation logs.</div>
        ) : (
          <ul className="space-y-2">
            {c.conversations!.map((m) => (
              <li
                key={m.id}
                className="p-2 bg-white/5 rounded text-[#e5e3c5]"
              >
                <div className="text-sm">{m.message}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(m.createdAt).toLocaleString()} • {m.channel}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* REMINDERS */}
      <div className="card p-4 space-y-3">
        <h2 className="text-lg font-semibold text-[#f5f3da]">Reminders</h2>

        {(c.reminders ?? []).length === 0 ? (
          <div className="text-gray-400 text-sm">No reminders.</div>
        ) : (
          <ul className="space-y-2">
            {c.reminders!.map((r) => (
              <li
                key={r.id}
                className="p-2 bg-white/5 rounded flex justify-between items-center text-[#e5e3c5]"
              >
                <div>
                  <div className="text-sm">
                    Remind at:{" "}
                    {new Date(r.remindAt).toLocaleDateString()}
                  </div>

                  {r.note && (
                    <div className="text-xs text-gray-400">{r.note}</div>
                  )}
                </div>

                <div className="text-xs">
                  {r.done ? "✔ Completed" : "Pending"}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* QUOTES */}
      <div className="card p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold border-l-2 border-[#e8d487] pl-2 text-[#f5f3da]">
            Quotes
          </h2>

          <Link to={`/quotes/new?clientId=${c.id}`} className="btn-gold">
            New Quote
          </Link>
        </div>

        <div className="space-y-2">
          {recent.map((q) => (
            <div
              key={q.id}
              className="flex items-center justify-between px-3 py-2 bg-white/5 rounded-lg hover:bg-white/10 transition"
            >
              <Link
                to={`/quotes/${q.id}`}
                className="text-[#f5f3da] text-sm underline"
              >
                {q.id}
              </Link>

              <button
                onClick={() => handleDeleteQuote(q.id)}
                className="text-red-500 hover:text-red-400 text-xs"
              >
                Delete
              </button>
            </div>
          ))}

          {clientQuotes.length > 5 && (
            <button
              onClick={() => navigate(`/quotes?clientId=${c.id}`)}
              className="text-xs text-[#e8d487] underline mt-2"
            >
              View All Quotes ({clientQuotes.length})
            </button>
          )}

          {!clientQuotes.length && (
            <div className="text-gray-500 text-center py-2">
              No quotes yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
