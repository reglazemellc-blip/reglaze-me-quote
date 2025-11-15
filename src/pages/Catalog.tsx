import { useEffect, useState } from 'react'
import { db, type ServiceCatalog } from '@db/index'

export default function Catalog() {
  const [catalog, setCatalog] = useState<ServiceCatalog>({
    id: 'catalog',
    services: []
  })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    ;(async () => {
      const fromDb = await db.catalog.get('catalog')
      if (fromDb) {
        setCatalog(fromDb)
      } else {
        const json = await import('@data/services.json')
        const init = { id: 'catalog', services: (json as any).services }
        await db.catalog.put(init)
        setCatalog(init)
      }
      setLoaded(true)
    })()
  }, [])

  function addService() {
    setCatalog(c => ({
      ...c,
      services: [
        ...c.services,
        { id: crypto.randomUUID(), name: 'New Service', subservices: [] }
      ]
    }))
  }

  function save() {
    db.catalog.put(catalog)
  }

  if (!loaded)
    return (
      <div className="p-6 text-gray-400 text-center tracking-wide">
        Loading…
      </div>
    )

  return (
    <div className="p-4 md:p-6 space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-wide text-[#f5f3da]">
          <span className="border-l-2 border-[#e8d487] pl-2">
            Service Catalog
          </span>
        </h2>

        <div className="flex items-center gap-2">
          <button className="btn btn-outline" onClick={addService}>
            Add Service
          </button>
          <button className="btn btn-primary" onClick={save}>
            Save
          </button>
        </div>
      </div>

      {/* SERVICES LIST */}
      <div className="space-y-5">
        {catalog.services.map((s, si) => (
          <div
            key={s.id}
            className="card p-5 rounded-2xl bg-[#101010] border border-[#2a2414] shadow-[0_10px_30px_rgba(0,0,0,0.5)] space-y-4"
          >
            {/* SERVICE NAME */}
            <input
              className="input font-semibold text-[#f5f3da] mb-1"
              value={s.name}
              onChange={e => {
                const name = e.target.value
                setCatalog(c => {
                  const arr = [...c.services]
                  arr[si] = { ...arr[si], name }
                  return { ...c, services: arr }
                })
              }}
            />

            {/* SUBSERVICES */}
            <div className="space-y-3">
              {s.subservices.map((sub, i) => (
                <div
                  key={sub.id}
                  className="grid grid-cols-12 gap-3 bg-black/20 p-3 rounded-xl border border-black/30"
                >
                  <input
                    className="input col-span-4"
                    placeholder="Subservice name"
                    value={sub.name}
                    onChange={e => {
                      const name = e.target.value
                      setCatalog(c => {
                        const arr = [...c.services]
                        const subs = [...arr[si].subservices]
                        subs[i] = { ...subs[i], name }
                        arr[si] = { ...arr[si], subservices: subs }
                        return { ...c, services: arr }
                      })
                    }}
                  />

                  <input
                    className="input col-span-7"
                    placeholder="Optional warning"
                    value={sub.warning || ''}
                    onChange={e => {
                      const warning = e.target.value
                      setCatalog(c => {
                        const arr = [...c.services]
                        const subs = [...arr[si].subservices]
                        subs[i] = { ...subs[i], warning }
                        arr[si] = { ...arr[si], subservices: subs }
                        return { ...c, services: arr }
                      })
                    }}
                  />

                  <button
                    className="text-red-500 hover:text-red-400 font-semibold col-span-1"
                    onClick={() => {
                      setCatalog(c => {
                        const arr = [...c.services]
                        const subs = arr[si].subservices.filter(
                          x => x.id !== sub.id
                        )
                        arr[si] = { ...arr[si], subservices: subs }
                        return { ...c, services: arr }
                      })
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}

              <button
                className="btn btn-outline"
                onClick={() => {
                  setCatalog(c => {
                    const arr = [...c.services]
                    arr[si] = {
                      ...arr[si],
                      subservices: [
                        ...arr[si].subservices,
                        { id: crypto.randomUUID(), name: 'New Subservice' }
                      ]
                    }
                    return { ...c, services: arr }
                  })
                }}
              >
                Add Subservice
              </button>
            </div>
          </div>
        ))}

        {!catalog.services.length && (
          <div className="text-center text-gray-500 py-6">
            No services yet.
          </div>
        )}
      </div>
    </div>
  )
}

/* UTILITY */
async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
