import { useEffect, useState } from 'react'
import { db, type ServiceCatalog } from '@db/index'

export default function Catalog(){
  const [catalog, setCatalog] = useState<ServiceCatalog>({ id: 'catalog', services: [] })
  const [loaded, setLoaded] = useState(false)
  useEffect(()=>{
    (async ()=>{
      const fromDb = await db.catalog.get('catalog')
      if (fromDb) setCatalog(fromDb)
      else {
        const json = await import('@data/services.json')
        const init = { id: 'catalog', services: (json as any).services }
        await db.catalog.put(init)
        setCatalog(init)
      }
      setLoaded(true)
    })()
  },[])

  function addService(){
    setCatalog(c => ({ ...c, services: [...c.services, { id: crypto.randomUUID(), name: 'New Service', subservices: [] }] }))
  }
  function save(){ db.catalog.put(catalog) }

  if (!loaded) return <div>Loading...</div>
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Service Catalog</h2>
        <div className="flex items-center gap-2">
          <button className="btn btn-outline" onClick={addService}>Add Service</button>
          <button className="btn btn-primary" onClick={save}>Save</button>
        </div>
      </div>
      <div className="space-y-4">
        {catalog.services.map((s, si) => (
          <div key={s.id} className="card p-4">
            <input className="input font-semibold mb-2" value={s.name} onChange={e=>{
              const name = e.target.value
              setCatalog(c => { const arr = [...c.services]; arr[si] = { ...arr[si], name }; return { ...c, services: arr } })
            }} />
            <div className="space-y-2">
              {s.subservices.map((sub, i) => (
                <div key={sub.id} className="grid grid-cols-12 gap-2">
                  <input className="input col-span-4" placeholder="Subservice" value={sub.name} onChange={e=>{
                    const name = e.target.value
                    setCatalog(c => { const arr = [...c.services]; const subs = [...arr[si].subservices]; subs[i] = { ...subs[i], name }; arr[si] = { ...arr[si], subservices: subs }; return { ...c, services: arr } })
                  }} />
                  <input className="input col-span-7" placeholder="Warning" value={sub.warning || ''} onChange={e=>{
                    const warning = e.target.value
                    setCatalog(c => { const arr = [...c.services]; const subs = [...arr[si].subservices]; subs[i] = { ...subs[i], warning }; arr[si] = { ...arr[si], subservices: subs }; return { ...c, services: arr } })
                  }} />
                  <button className="text-red-600" onClick={()=>{
                    setCatalog(c => { const arr = [...c.services]; const subs = arr[si].subservices.filter(x => x.id !== sub.id); arr[si] = { ...arr[si], subservices: subs }; return { ...c, services: arr } })
                  }}>Delete</button>
                </div>
              ))}
              <button className="btn btn-outline" onClick={()=>{
                setCatalog(c => { const arr = [...c.services]; arr[si] = { ...arr[si], subservices: [...arr[si].subservices, { id: crypto.randomUUID(), name: 'New Subservice' }] }; return { ...c, services: arr } })
              }}>Add subservice</button>
            </div>
          </div>
        ))}
        {!catalog.services.length && <div className="text-gray-500">No services yet.</div>}
      </div>
    </div>
  )
}
