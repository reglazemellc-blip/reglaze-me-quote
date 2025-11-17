import { useEffect, useState } from 'react'
import { db } from '@db/index'
import type { LineItem } from '@db/index'

type Props = {
  items: LineItem[]
  setItems: (fn: (prev: LineItem[]) => LineItem[]) => void
}

type Service = {
  id: string
  name: string
  subservices: {
    id: string
    name: string
    warning?: string
  }[]
}

export default function QuoteServicesSelector({ items, setItems }: Props): JSX.Element {
  const [services, setServices] = useState<Service[]>([])

  useEffect(() => {
    ;(async () => {
      const cat = await db.catalog.get('catalog')
      if (cat) setServices(cat.services)
    })()
  }, [])

  function isOn(subId: string): boolean {
    return items.some((i) => i.id === svcItemId(subId))
  }

  function toggle(subId: string, subName: string, warning?: string) {
    const id = svcItemId(subId)

    if (isOn(subId)) {
      setItems((prev) => prev.filter((i) => i.id !== id))
    } else {
      setItems((prev) => [
        ...prev,
        { id, description: subName, qty: 1, unitPrice: 0, total: 0, warning }
      ])
    }
  }

  return (
    <div
      className="
        p-6 rounded-2xl
        bg-[#151515]
        border border-[#2a2a2a]
        shadow-[0_0_20px_rgba(255,215,0,0.12)]
      "
    >
      <h3 className="text-lg font-semibold text-[#e8d487] mb-4">
        Services
      </h3>

      <div className="space-y-6">
        {services.map((svc) => (
          <div key={svc.id} className="space-y-2">
            <div className="text-[#fff1a8] font-medium text-base">
              {svc.name}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {svc.subservices.map((sub) => (
                <label
                  key={sub.id}
                  className="
                    flex items-center gap-3 p-3 rounded-xl cursor-pointer
                    bg-[#0f0f0f]
                    border border-[#2a2a2a]
                    hover:border-[#b8860b]
                    transition-all
                    text-[#e8d487]
                    text-sm
                  "
                >
                  <input
                    type="checkbox"
                    checked={isOn(sub.id)}
                    onChange={() => toggle(sub.id, sub.name, sub.warning)}
                    className="
                      w-4 h-4 rounded
                      accent-[#ffd700]
                      cursor-pointer
                    "
                  />

                  <span className="flex-1">{sub.name}</span>

                  {sub.warning && (
                    <span className="text-[#ffcc66] text-xs">
                      (⚠ {sub.warning})
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>
        ))}

        {!services.length && (
          <div className="text-[#777]">
            No services defined. Add them in Catalog.
          </div>
        )}
      </div>
    </div>
  )
}

function svcItemId(subId: string): string {
  return `svc-${subId}`
}
