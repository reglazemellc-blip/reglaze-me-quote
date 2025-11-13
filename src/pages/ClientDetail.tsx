import { useParams } from 'react-router-dom'
import { useClientsStore } from '@store/useClientsStore'
import { useQuotesStore } from '@store/useQuotesStore'
import { useEffect, useRef, useState } from 'react'
import InlineEditableText from '@components/InlineEditableText'
import { db } from '@db/index'
import { Link } from 'react-router-dom'

export default function ClientDetail(){
  const { id } = useParams()
  const { clients, init: initClients, upsert } = useClientsStore()
  const { quotes, init: initQuotes } = useQuotesStore()
  useEffect(()=>{ initClients(); initQuotes() }, [initClients, initQuotes])
  const client = clients.find(c=>c.id===id)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  if (!client) return <div className="text-gray-500">Client not found.</div>
  const list = quotes.filter(q=>q.clientId===client.id)
  return (
    <div className="space-y-6">
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Client</h2>
          <button className="btn btn-outline" onClick={async ()=>{
            const count = await db.quotes.where('clientId').equals(client.id).count()
            const msg = count>0 ? `Delete this client and ${count} associated quote(s)?` : 'Delete this client?'
            const yes = confirm(msg)
            if (yes) {
              await useClientsStore.getState().remove(client.id)
              window.location.href = '/clients'
            }
          }}>Delete</button>
        </div>
        <InlineEditableText className="mb-2" value={client.name} onSave={(v)=>upsert({ ...client, name: v })} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <InlineEditableText value={client.phone} onSave={(v)=>upsert({ ...client, phone: v })} placeholder="Phone" />
          <InlineEditableText value={client.email} onSave={(v)=>upsert({ ...client, email: v })} placeholder="Email" />
          <InlineEditableText value={client.address} onSave={(v)=>upsert({ ...client, address: v })} placeholder="Address" />
          <InlineEditableText value={client.notes} onSave={(v)=>upsert({ ...client, notes: v })} placeholder="Notes" />
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium">Photos</div>
            <div className="flex items-center gap-2">
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={async (e)=>{
                const files = Array.from(e.target.files || [])
                if (!files.length) return
                setUploading(true)
                const urls: string[] = []
                for (const f of files) {
                  const b64 = await fileToDataUrl(f)
                  urls.push(b64)
                }
                await upsert({ ...client, photos: [...(client.photos || []), ...urls] })
                setUploading(false)
              }} />
              <button className="btn btn-outline" onClick={()=>fileRef.current?.click()}>{uploading ? 'Uploading...' : 'Add Photos'}</button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {(client.photos || []).map((src, i) => (
              <div key={i} className="relative">
                <img src={src} className="w-full h-24 object-cover rounded" />
                <button className="absolute top-1 right-1 bg-white/80 px-1 rounded text-xs" onClick={async ()=>{
                  const next = (client.photos || []).filter((_, idx)=>idx!==i)
                  await upsert({ ...client, photos: next })
                }}>✕</button>
              </div>
            ))}
            {!(client.photos || []).length && <div className="text-gray-500">No photos</div>}
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Quotes</h2>
          <Link to={`/quotes/new?clientId=${client.id}`} className="btn btn-primary">New Quote</Link>
        </div>
        <div className="divide-y">
          {list.map(q => (
            <Link key={q.id} to={`/quotes/${q.id}`} className="block py-3 hover:bg-gray-50">{q.id}</Link>
          ))}
          {!list.length && <div className="text-gray-500 py-4 text-center">No quotes yet.</div>}
        </div>
      </div>
    </div>
  )
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
