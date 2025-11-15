import { useParams, Link } from 'react-router-dom'
import { useClientsStore } from '@store/useClientsStore'
import { useQuotesStore } from '@store/useQuotesStore'
import { useEffect, useRef, useState } from 'react'
import InlineEditableText from '@components/InlineEditableText'
import { db } from '@db/index'

export default function ClientDetail() {
  const { id } = useParams()
  const { clients, init: initClients, upsert } = useClientsStore()
  const { quotes, init: initQuotes } = useQuotesStore()

  useEffect(() => {
    initClients()
    initQuotes()
  }, [initClients, initQuotes])

  const client = clients.find(c => c.id === id)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  if (!client)
    return (
      <div className="p-6 text-center text-gray-500">
        Client not found.
      </div>
    )

  const clientQuotes = quotes.filter(q => q.clientId === client.id)

  return (
    <div className="p-4 md:p-6 space-y-6">

      {/* ===================== CLIENT INFO ===================== */}
      <div className="card p-6 bg-[#101010] border border-[#2a2414] rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.6)]">

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold tracking-wide text-[#f5f3da]">
            <span className="border-l-2 border-[#e8d487] pl-2">Client</span>
          </h2>

          <button
            className="btn btn-outline"
            onClick={async () => {
              const count = await db.quotes.where('clientId').equals(client.id).count()
              const msg =
                count > 0
                  ? `Delete this client and ${count} associated quote(s)?`
                  : 'Delete this client?'

              if (confirm(msg)) {
                await useClientsStore.getState().remove(client.id)
                window.location.href = '/clients'
              }
            }}
          >
            Delete
          </button>
        </div>

        {/* Editable Fields */}
        <InlineEditableText
          className="mb-3 text-xl font-semibold text-[#f5f3da]"
          value={client.name}
          onSave={v => upsert({ ...client, name: v })}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <InlineEditableText
            value={client.phone}
            placeholder="Phone"
            onSave={v => upsert({ ...client, phone: v })}
          />
          <InlineEditableText
            value={client.email}
            placeholder="Email"
            onSave={v => upsert({ ...client, email: v })}
          />
          <InlineEditableText
            value={client.address}
            placeholder="Address"
            onSave={v => upsert({ ...client, address: v })}
          />
          <InlineEditableText
            value={client.notes}
            placeholder="Notes"
            onSave={v => upsert({ ...client, notes: v })}
          />
        </div>

        {/* ===================== PHOTOS ===================== */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="font-medium text-[#f5f3da]">Photos</div>

            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={async e => {
                  const files = Array.from(e.target.files || [])
                  if (!files.length) return

                  setUploading(true)
                  const newPhotos: string[] = []

                  for (const f of files) {
                    const b64 = await fileToDataUrl(f)
                    newPhotos.push(b64)
                  }

                  await upsert({
                    ...client,
                    photos: [...(client.photos || []), ...newPhotos]
                  })

                  setUploading(false)
                }}
              />

              <button
                className="btn btn-outline"
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? 'Uploading…' : 'Add Photos'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(client.photos || []).map((src, i) => (
              <div key={i} className="relative group">
                <img
                  src={src}
                  className="w-full h-24 object-cover rounded-lg border border-[#2a2a2a]"
                />

                <button
                  className="absolute top-1 right-1 bg-black/70 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition"
                  onClick={async () => {
                    const next = (client.photos || []).filter((_, idx) => idx !== i)
                    await upsert({ ...client, photos: next })
                  }}
                >
                  ✕
                </button>
              </div>
            ))}

            {!(client.photos || []).length && (
              <div className="text-gray-500 col-span-full">
                No photos uploaded.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===================== QUOTES LIST ===================== */}
      <div className="card p-6 bg-[#101010] border border-[#2a2414] rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold tracking-wide text-[#f5f3da]">
            <span className="border-l-2 border-[#e8d487] pl-2">Quotes</span>
          </h2>

          <Link
            to={`/quotes/new?clientId=${client.id}`}
            className="btn btn-primary"
          >
            New Quote
          </Link>
        </div>

        <div className="divide-y divide-black/20">
          {clientQuotes.map(q => (
            <Link
              key={q.id}
              to={`/quotes/${q.id}`}
              className="block py-3 px-2 rounded-lg hover:bg-black/40 transition text-[#f5f3da]"
            >
              {q.id}
            </Link>
          ))}

          {!clientQuotes.length && (
            <div className="text-center text-gray-500 py-4">
              No quotes yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* Utility */
async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
