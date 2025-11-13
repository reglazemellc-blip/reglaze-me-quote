import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useClientsStore } from '@store/useClientsStore'
import { useQuotesStore } from '@store/useQuotesStore'
import { db, type LineItem, type Quote } from '@db/index'
import { computeItem, formatCurrency, sumItems } from '@utils/quote'
import SignatureModal from '@components/SignatureModal'
import PDFButton from '@components/PDFButton'
import StatusBadge from '@components/StatusBadge'
import QuoteServicesSelector from '@components/QuoteServicesSelector'
import { useSettingsStore } from '@store/useSettingsStore'
import { useToastStore } from '@store/useToastStore'

export default function QuoteEditor({ mode }:{ mode: 'create'|'edit' }){
  const { id } = useParams()
  const [params] = useSearchParams()
  const { clients, init: initClients, upsert: upsertClient } = useClientsStore()
  const { quotes, init: initQuotes, upsert } = useQuotesStore()
  const navigate = useNavigate()
  const [openSig, setOpenSig] = useState(false)
  const { settings, init: initSettings } = useSettingsStore()

  useEffect(()=>{ initClients(); initQuotes(); initSettings() }, [initClients, initQuotes, initSettings])

  const existing = mode==='edit' ? quotes.find(q=>q.id===id) : undefined
  const [clientName, setClientName] = useState('')
  const [clientId, setClientId] = useState(existing?.clientId || params.get('clientId') || '')
  const [clientPhone, setClientPhone] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientAddress, setClientAddress] = useState('')
  const [clientNotes, setClientNotes] = useState('')
  const [items, setItems] = useState<LineItem[]>(existing?.items || [])
  const [taxRate, setTaxRate] = useState(existing?.taxRate ?? (settings?.defaultTaxRate || 0))
  const [discount, setDiscount] = useState(existing?.discount ?? 0)
  const [notes, setNotes] = useState(existing?.notes || '')
  const [status, setStatus] = useState<Quote['status']>(existing?.status || 'pending')
  const [signature, setSignature] = useState<Quote['signature']>(existing?.signature || null)
  const viewMode = (params.get('view') === 'client')

  const totals = useMemo(()=> sumItems(items, taxRate, discount), [items, taxRate, discount])

  const targetId = 'quote-preview'

  const selectedClient = useMemo(()=> clients.find(c=>c.id===clientId), [clients, clientId])

  useEffect(()=>{
    if (selectedClient) {
      setClientName(selectedClient.name)
      setClientPhone(selectedClient.phone || '')
      setClientEmail(selectedClient.email || '')
      setClientAddress(selectedClient.address || '')
      setClientNotes(selectedClient.notes || '')
    }
  }, [selectedClient])

  function addItem(){
    setItems(prev => [...prev, computeItem({ id: crypto.randomUUID(), description: '', qty: 1, unitPrice: 0, total: 0 })])
  }
  function updateItem(id: string, patch: Partial<LineItem>){
    setItems(prev => prev.map(it => it.id===id ? computeItem({ ...it, ...patch }) : it))
  }
  function removeItem(id: string){ setItems(prev => prev.filter(it => it.id!==id)) }

  async function save() {
    let cid = clientId
    if (!cid) {
      // create client
      const now = Date.now()
      cid = crypto.randomUUID()
      await upsertClient({ id: cid, name: clientName || 'Unnamed', phone: clientPhone || undefined, email: clientEmail || undefined, address: clientAddress || undefined, notes: clientNotes || undefined, createdAt: now, updatedAt: now })
    } else if (selectedClient) {
      // update details if changed
      const updated = { ...selectedClient, name: clientName || 'Unnamed', phone: clientPhone || undefined, email: clientEmail || undefined, address: clientAddress || undefined, notes: clientNotes || undefined }
      await upsertClient(updated)
    }
    const saved = await upsert({
      id: existing?.id || '',
      clientId: cid,
      services: [],
      items,
      subtotal: totals.subtotal,
      taxRate,
      tax: totals.tax,
      discount,
      total: totals.total,
      notes,
      status,
      signature,
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now(),
    })
    navigate(`/quotes/${saved.id}`)
    useToastStore.getState().show('Save Successful')
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="card p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="label">Select Existing</label>
              <select disabled={viewMode} className="input" value={clientId || ''} onChange={e=>{
                const id = e.target.value
                setClientId(id)
                const c = clients.find(x=>x.id===id)
                if (c) {
                  setClientName(c.name)
                  setClientPhone(c.phone || '')
                  setClientEmail(c.email || '')
                  setClientAddress(c.address || '')
                  setClientNotes(c.notes || '')
                }
              }}>
                <option value="">New client...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select disabled={viewMode} className="input" value={status} onChange={e=>setStatus(e.target.value as any)}>
                {['pending','approved','scheduled','in_progress','completed','canceled'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div>
              <label className="label">Client Name</label>
              <input disabled={viewMode} className="input" value={clientName} onChange={e=>setClientName(e.target.value)} placeholder="Client name" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input disabled={viewMode} className="input" value={clientPhone} onChange={e=>setClientPhone(e.target.value)} placeholder="Phone" />
            </div>
            <div>
              <label className="label">Email</label>
              <input disabled={viewMode} className="input" value={clientEmail} onChange={e=>setClientEmail(e.target.value)} placeholder="Email" />
            </div>
            <div>
              <label className="label">Address</label>
              <input disabled={viewMode} className="input" value={clientAddress} onChange={e=>setClientAddress(e.target.value)} placeholder="Address" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Client Notes</label>
              <textarea disabled={viewMode} className="input h-20" value={clientNotes} onChange={e=>setClientNotes(e.target.value)} placeholder="Notes about the client" />
            </div>
          </div>
        </div>

        {!viewMode && <QuoteServicesSelector items={items} setItems={setItems} />}

        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Line Items</h3>
            {!viewMode && <button className="btn btn-primary" onClick={addItem}>Add Item</button>}
          </div>
          <div className="space-y-2">
            {items.map(it => (
              <div key={it.id} className="grid grid-cols-12 gap-2">
                <input disabled={viewMode} className="input col-span-6" placeholder="Description" value={it.description} onChange={e=>updateItem(it.id, { description: e.target.value })} />
                <input disabled={viewMode} className="input col-span-2" type="number" placeholder="Qty" value={it.qty} onChange={e=>updateItem(it.id, { qty: Number(e.target.value) })} />
                <input disabled={viewMode} className="input col-span-2" type="number" placeholder="Unit $" value={it.unitPrice} onChange={e=>updateItem(it.id, { unitPrice: Number(e.target.value) })} />
                <div className="col-span-2 flex items-center justify-between">
                  <div className="font-medium">{formatCurrency(it.total)}</div>
                  {!viewMode && <button className="text-red-600" onClick={()=>removeItem(it.id)}>Remove</button>}
                </div>
                <input disabled={viewMode} className="input col-span-12" placeholder="Warning (optional)" value={it.warning || ''} onChange={e=>updateItem(it.id, { warning: e.target.value })} />
              </div>
            ))}
            {!items.length && <div className="text-gray-500">No items</div>}
          </div>
        </div>

        {!viewMode && (
          <div className="card p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="label">Tax Rate (%)<input className="input" type="number" value={(taxRate*100).toString()} onChange={e=>setTaxRate(Number(e.target.value)/100)} /></label>
            <label className="label">Discount ($)<input className="input" type="number" value={discount} onChange={e=>setDiscount(Number(e.target.value))} /></label>
            <div className="flex items-end">
              <button className="btn btn-primary w-full" onClick={save}>Save Quote</button>
            </div>
          </div>
        )}

        <div className="card p-4 flex items-center gap-2">
          {!viewMode && <button className="btn btn-secondary" onClick={()=>setOpenSig(true)}>Sign</button>}
          <PDFButton targetId={targetId} fileName={`${existing?.id || 'quote'}_${clientName || 'client'}.pdf`} />
          {signature && <span className="text-xs text-gray-600">Signed</span>}
        </div>
      </div>

      <div className="card p-4 lg:sticky lg:top-6 h-fit" id={targetId} style={{ background: '#f2f5f9', color: '#1f2a3a' }}>
        <QuotePreview clientName={clientName || 'Unnamed'} client={{ phone: clientPhone, email: clientEmail, address: clientAddress }} items={items} totals={{ ...totals, taxRate, discount }} status={status} signature={signature?.dataUrl} notes={notes} setNotes={setNotes} readOnly={viewMode} />
      </div>

      <SignatureModal open={openSig} onClose={()=>setOpenSig(false)} onSave={(dataUrl)=>{ setSignature({ dataUrl, signedAt: new Date().toISOString() }); setOpenSig(false) }} />
    </div>
  )
}

function QuotePreview({ clientName, client, items, totals, status, signature, notes, setNotes, readOnly }:{ clientName:string; client:{ phone?:string; email?:string; address?:string }; items:LineItem[]; totals:{ subtotal:number; tax:number; total:number; taxRate:number; discount:number }; status:Quote['status']; signature?:string|null; notes:string; setNotes:(v:string)=>void; readOnly?: boolean }){
  const s = useSettingsStore.getState().settings
  const left = s?.companyLeftLines || ['ReGlaze Me LLC', '217 3rd Ave', 'Frankfort, NY 13340']
  const right = s?.companyRightLines || ['reglazemellc@gmail.com', '315-525-9142']
  return (
    <div className="relative">
      {s?.watermark && (
        <img src={s.watermark} className="absolute inset-0 m-auto opacity-10 pointer-events-none select-none w-1/2" />
      )}
      <header className="flex items-center justify-between border-b pb-3 mb-3">
        <div className="text-sm text-gray-700">
          {left.map((l:string, i:number)=>(<div key={i}>{l}</div>))}
        </div>
        <img src="/logo.png" className="w-16 h-16" />
        <div className="text-sm text-right text-gray-700">
          {right.map((l:string, i:number)=>(<div key={i}>{l}</div>))}
        </div>
      </header>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs text-gray-500">Client</div>
          <div className="font-semibold">{clientName}</div>
          <div className="text-xs text-gray-600">{[client.phone, client.email].filter(Boolean).join(' • ')}</div>
          {client.address && <div className="text-xs text-gray-600">{client.address}</div>}
        </div>
        <StatusBadge status={status} />
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500">
            <th className="py-2">Description</th>
            <th className="py-2">Qty</th>
            <th className="py-2">Unit</th>
            <th className="py-2">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map(it => (
            <tr key={it.id} className="border-t">
              <td className="py-2">
                <div>{it.description || <span className="text-gray-400">No description</span>}</div>
                {it.warning && <div className="text-xs text-amber-600">⚠ {it.warning}</div>}
              </td>
              <td className="py-2">{it.qty}</td>
              <td className="py-2">{formatCurrency(it.unitPrice)}</td>
              <td className="py-2 font-medium">{formatCurrency(it.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-xs text-gray-500">Notes</div>
          <textarea disabled={readOnly} className="input h-24" value={notes} onChange={e=>setNotes(e.target.value)} />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between"><span className="text-gray-600">Subtotal</span><span>{formatCurrency(totals.subtotal)}</span></div>
          <div className="flex items-center justify-between"><span className="text-gray-600">Tax ({(totals.taxRate*100).toFixed(2)}%)</span><span>{formatCurrency(totals.tax)}</span></div>
          <div className="flex items-center justify-between"><span className="text-gray-600">Discount</span><span>-{formatCurrency(totals.discount)}</span></div>
          <div className="flex items-center justify-between font-semibold text-lg border-t pt-1"><span>Total</span><span>{formatCurrency(totals.total)}</span></div>
        </div>
      </div>
      <div className="mt-4">
        <div className="text-xs text-gray-500 mb-1">Signature</div>
        {signature ? <img src={signature} alt="signature" className="h-20" /> : <div className="h-20 border rounded bg-gray-50" />}
      </div>
    </div>
  )
}
