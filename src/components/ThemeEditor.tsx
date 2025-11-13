import { useRef, useState } from 'react'
import { useSettingsStore } from '@store/useSettingsStore'

export default function ThemeEditor({ onClose }: { onClose: ()=>void }){
  const { settings, update, exportJSON, importJSON } = useSettingsStore()
  const [left, setLeft] = useState(settings?.companyLeftLines || [])
  const [right, setRight] = useState(settings?.companyRightLines || [])
  const fileRef = useRef<HTMLInputElement>(null)

  if (!settings) return null

  const theme = settings.theme

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 fade-in">
      <div className="card w-full max-w-2xl p-6 relative">
        <button className="absolute right-3 top-3 text-gray-500" onClick={onClose}>✕</button>
        <h2 className="text-lg font-semibold mb-4">Admin Edit Mode</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ColorField label="Primary" value={theme.primary} onChange={(v)=>update({ theme: { ...theme, primary: v } })} />
          <ColorField label="Secondary" value={theme.secondary} onChange={(v)=>update({ theme: { ...theme, secondary: v } })} />
          <ColorField label="Accent 1" value={theme.accent1} onChange={(v)=>update({ theme: { ...theme, accent1: v } })} />
          <ColorField label="Accent 2" value={theme.accent2} onChange={(v)=>update({ theme: { ...theme, accent2: v } })} />
          <ColorField label="Background" value={theme.background} onChange={(v)=>update({ theme: { ...theme, background: v } })} />
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <LineEditor title="Company Left" lines={left} setLines={setLeft} onSave={()=>update({ companyLeftLines: left })} />
          <LineEditor title="Company Right" lines={right} setLines={setRight} onSave={()=>update({ companyRightLines: right })} />
        </div>

        <div className="mt-6 flex items-center gap-2">
          <button className="btn btn-outline" onClick={async ()=>{
            const blob = await exportJSON()
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'reglaze-data.json'
            a.click()
            URL.revokeObjectURL(url)
          }}>Export JSON</button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={async (e)=>{
            const f = e.target.files?.[0]
            if (!f) return
            const text = await f.text()
            await importJSON(JSON.parse(text))
            alert('Data imported')
          }} />
          <button className="btn btn-outline" onClick={()=>fileRef.current?.click()}>Import JSON</button>
        </div>

      </div>
    </div>
  )
}

function ColorField({ label, value, onChange }:{ label:string; value:string; onChange:(v:string)=>void }){
  return (
    <label className="label flex items-center gap-3">
      <span className="w-24">{label}</span>
      <input type="color" value={value} onChange={(e)=>onChange(e.target.value)} />
      <input className="input" value={value} onChange={(e)=>onChange(e.target.value)} />
    </label>
  )
}

function LineEditor({ title, lines, setLines, onSave }:{ title:string; lines:string[]; setLines:(v:string[])=>void; onSave:()=>void }){
  return (
    <div>
      <div className="font-medium mb-2">{title}</div>
      {lines.map((l,i)=> (
        <input key={i} className="input mb-2" value={l} onChange={(e)=>{
          const next = [...lines]; next[i] = e.target.value; setLines(next)
        }} />
      ))}
      <button className="btn btn-primary mt-2" onClick={()=>{ setLines(lines.filter(l=>l.trim().length)); onSave() }}>Save</button>
      <button className="btn btn-outline mt-2 ml-2" onClick={()=>setLines([...lines, ''])}>Add line</button>
    </div>
  )
}

