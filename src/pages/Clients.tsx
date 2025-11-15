import { useClientsStore } from '@store/useClientsStore'
import { useEffect, useMemo, useState } from 'react'
import SearchBar from '@components/SearchBar'
import { Link } from 'react-router-dom'
import { db } from '@db/index'

export default function Clients() {
  const { clients, init } = useClientsStore()
  const [term, setTerm] = useState('')

  useEffect(() => { init() }, [init])

  const list = useMemo(() => {
    const arr = [...clients]
    if (term) {
      const q = term.toLowerCase()
      return arr.filter(c =>
        [c.name, c.phone, c.email, c.address]
          .filter(Boolean)
          .some(v => v!.toLowerCase().includes(q))
      )
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
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
          <h2 className="font-semibold text-lg text-[#e8d487]">Clients</h2>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex-1 md:flex-none">
              <SearchBar
                placeholder="Search by name, phone, email, address"
                onChange={setTerm}
              />
            </div>

            <button
              className="btn-gold whitespace-nowrap"
              onClick={() => setShowForm(s => !s)}
            >
              {showForm ? 'Close' : 'Add Client'}
            </button>
          </div>
        </div>

        {/* ADD CLIENT FORM */}
        {showForm && (
          <div className="p-4 rounded-xl bg-[#0f0f0f] border border-[#2a2414] mb-4 shadow-[0_0_20px_rgba(0,0,0,0.4)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="text-sm text-[#e8d487]/80">
                Name
                <input
                  className="input mt-1"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Full name"
                />
              </label>

              <label className="text-sm text-[#e8d487]/80">
                Phone
                <input
                  className="input mt-1"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="(555) 555-5555"
                />
              </label>

              <label className="text-sm text-[#e8d487]/80">
                Email
                <input
                  className="input mt-1"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@email.com"
                />
              </label>

              <label className="text-sm text-[#e8d487]/80">
                Address
                <input
                  className="input mt-1"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Street, City, State"
                />
              </label>

              <label className="text-sm text-[#e8d487]/80 md:col-span-2">
                Notes
                <textarea
                  className="input h-24 mt-1"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Notes"
                />
              </label>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                className="btn-gold"
                onClick={async () => {
                  if (!name.trim()) {
                    alert('Please enter a name')
                    return
                  }

                  await useClientsStore.getState().create({
                    name: name.trim(),
                    phone: phone || undefined,
                    email: email || undefined,
                    address: address || undefined,
                    notes: notes || undefined
                  })

                  setName('')
                  setPhone('')
                  setEmail('')
                  setAddress('')
                  setNotes('')
                  setShowForm(false)
                }}
              >
                Save Client
              </button>

              <button
                className="btn-outline-gold"
                onClick={() => {
                  setName('')
                  setPhone('')
                  setEmail('')
                  setAddress('')
                  setNotes('')
                  setShowForm(false)
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* CLIENT LIST */}
        <div className="divide-y divide-[#2a2a2a]">
          {list.map(c => (
            <div
              key={c.id}
              className="flex items-center justify-between py-3 hover:bg-black/40 rounded-lg transition-all px-2"
            >
              <Link
                to={`/clients/${c.id}`}
                className="flex-1 mr-3 hover:opacity-90"
              >
                <div className="font-medium text-[#f5f3da]">{c.name}</div>
                <div className="text-xs text-gray-400">
                  {[c.phone, c.email, c.address]
                    .filter(Boolean)
                    .join(' • ')}
                </div>
              </Link>

              <button
                className="btn-outline-gold whitespace-nowrap"
                onClick={async () => {
                  const count = await db.quotes
                    .where('clientId')
                    .equals(c.id)
                    .count()

                  const msg =
                    count > 0
                      ? `Delete this client and ${count} associated quote(s)?`
                      : 'Delete this client?'

                  if (confirm(msg)) {
                    await useClientsStore.getState().remove(c.id)
                  }
                }}
              >
                Delete
              </button>
            </div>
          ))}

          {!list.length && (
            <div className="text-center text-gray-500 py-6">
              No clients found.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
