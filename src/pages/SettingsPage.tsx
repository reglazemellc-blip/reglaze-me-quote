import { useEffect, useState } from 'react'
import { useSettingsStore } from '@store/useSettingsStore'

export default function SettingsPage(){
  const { settings, init, update } = useSettingsStore()
  const [taxRatePct, setTaxRatePct] = useState(0)
  useEffect(()=>{ init() }, [init])
  useEffect(()=>{ if (settings) setTaxRatePct((settings.defaultTaxRate || 0) * 100) }, [settings])
  if (!settings) return null
  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h2 className="font-semibold mb-2">Business Info</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <TextareaList label="Left" value={settings.companyLeftLines} onChange={(v)=>update({ companyLeftLines: v })} />
          <TextareaList label="Right" value={settings.companyRightLines} onChange={(v)=>update({ companyRightLines: v })} />
        </div>
      </div>
      <div className="card p-4">
        <h2 className="font-semibold mb-2">Defaults</h2>
        <label className="label">Default Tax Rate (%)
          <input className="input" type="number" value={taxRatePct} onChange={e=>setTaxRatePct(Number(e.target.value))} onBlur={()=>update({ defaultTaxRate: taxRatePct/100 })} />
        </label>
        <div className="mt-4">
          <div className="label">PDF Watermark</div>
          <div className="flex items-center gap-2">
            <input type="file" accept="image/*" onChange={async (e)=>{
              const f = e.target.files?.[0]
              if (!f) return
              const dataUrl = await fileToDataUrl(f)
              await update({ watermark: dataUrl })
            }} />
            {settings.watermark && <img src={settings.watermark} className="h-10" />}
          </div>
        </div>
      </div>
    </div>
  )
}

function TextareaList({ label, value, onChange }:{ label:string; value:string[]; onChange:(v:string[])=>void }){
  return (
    <label className="label">
      {label}
      <textarea className="input h-32" value={value.join('\n')} onChange={e=>onChange(e.target.value.split('\n'))} />
    </label>
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
