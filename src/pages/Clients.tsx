import { useClientsStore } from '@store/useClientsStore'
import { useEffect, useMemo, useState } from 'react'
import SearchBar from '@components/SearchBar'
import { Link } from 'react-router-dom'
import { db } from '@db/index'

export default function Clients(){
  const { clients, init } = useClientsStore()
  const [term, setTerm] = useState('')
  useEffect(()=>{ init() }, [init])
  const list = useMemo(()=>{
    const arr = [...clients]
    if (term) {
      const q = term.toLowerCase()
      return arr.filter(c => [c.name, c.phone, c.email, c.address].filter(Boolean).some(v => v!.toLowerCase().includes(q)))
    }
    return arr
  }, [clients, term])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Clients</h2>
        <div className="flex items-center gap-2">
          <SearchBar placeholder="Search by name, phone, email, address" onChange={setTerm} />
          <button className="btn btn-primary" onClick={()=>setShowForm(s=>!s)}>{showForm ? 'Close' : 'Add Client'}</button>
        </div>
      </div>

      {showForm && (
        <div className="mb-4 p-4 rounded-lg" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <label className="label">Name<input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" /></label>
            <label className="label">Phone<input className="input" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="(555) 555-5555" /></label>
            <label className="label">Email<input className="input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@email.com" /></label>
            <label className="label">Address<input className="input" value={address} onChange={e=>setAddress(e.target.value)} placeholder="Street, City, State" /></label>
            <label className="label md:col-span-2">Notes<textarea className="input h-20" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Notes" /></label>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button className="btn btn-primary" onClick={async ()=>{
              if (!name.trim()) { alert('Please enter a name'); return }
              await useClientsStore.getState().create({ name: name.trim(), phone: phone || undefined, email: email || undefined, address: address || undefined, notes: notes || undefined })
              setName(''); setPhone(''); setEmail(''); setAddress(''); setNotes(''); setShowForm(false)
            }}>Save Client</button>
            <button className="btn btn-outline" onClick={()=>{ setName(''); setPhone(''); setEmail(''); setAddress(''); setNotes(''); setShowForm(false) }}>Cancel</button>
          </div>
        </div>
      )}
      <div className="divide-y">
        {list.map(c => (
          <div key={c.id} className="flex items-center justify-between py-3">
            <Link to={`/clients/${c.id}`} className="flex-1 mr-3 hover:opacity-90">
              <div className="font-medium">{c.name}</div>
              <div className="text-xs text-gray-400">{[c.phone, c.email, c.address].filter(Boolean).join(' • ')}</div>
            </Link>
            <button className="btn btn-outline" onClick={async ()=>{
              const count = await db.quotes.where('clientId').equals(c.id).count()
              const msg = count>0 ? `Delete this client and ${count} associated quote(s)?` : 'Delete this client?'
              const yes = confirm(msg)
              if (yes) await useClientsStore.getState().remove(c.id)
            }}>Delete</button>
          </div>
        ))}
        {!list.length && <div className="text-center text-gray-500 py-6">No clients.</div>}
      </div>
    </div>
  )
}
