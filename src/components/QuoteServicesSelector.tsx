import { useEffect, useState } from 'react'
import { db } from '@db/index'
import type { LineItem } from '@db/index'

type Props = {
  items: LineItem[]
  setItems: (fn: (prev: LineItem[]) => LineItem[]) => void
}

export default function QuoteServicesSelector({ items, setItems }: Props){
  const [services, setServices] = useState<{ id:string; name:string; subservices: { id:string; name:string; warning?:string }[] }[]>([])
  useEffect(()=>{
    (async ()=>{
      const cat = await db.catalog.get('catalog')
      if (cat) setServices(cat.services)
    })()
  },[])

  function isOn(subId: string){ return items.some(i => i.id === svcItemId(subId)) }
  function toggle(subId: string, subName: string, warning?: string){
    const id = svcItemId(subId)
    if (isOn(subId)) {
      setItems(prev => prev.filter(i => i.id !== id))
    } else {
      setItems(prev => [...prev, { id, description: subName, qty: 1, unitPrice: 0, total: 0, warning }])
    }
  }

  return (
    <div className="card p-4">
      <h3 className="font-semibold mb-2">Services</h3>
      <div className="space-y-4">
        {services.map(s => (
          <div key={s.id}>
            <div className="font-medium mb-1">{s.name}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {s.subservices.map(sub => (
                <label key={sub.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={isOn(sub.id)} onChange={()=>toggle(sub.id, sub.name, sub.warning)} />
                  <span>{sub.name}</span>
                  {sub.warning && <span className="text-amber-700">(⚠ {sub.warning})</span>}
                </label>
              ))}
            </div>
          </div>
        ))}
        {!services.length && <div className="text-gray-500">No services defined. Add them in Catalog.</div>}
      </div>
    </div>
  )
}

function svcItemId(subId: string){ return `svc-${subId}` }

