import { useState } from 'react'

export default function InlineEditableText({ value, onSave, className, placeholder }:{ value?: string; onSave:(v:string)=>void; className?: string; placeholder?: string }){
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(value || '')
  return (
    <div className={className}>
      {editing ? (
        <div className="flex items-center gap-2">
          <input autoFocus className="input" value={text} onChange={e=>setText(e.target.value)} placeholder={placeholder} />
          <button className="btn btn-primary" onClick={()=>{ onSave(text); setEditing(false) }}>Save</button>
          <button className="btn btn-outline" onClick={()=>{ setText(value || ''); setEditing(false) }}>Cancel</button>
        </div>
      ) : (
        <div className="cursor-text" onClick={()=>setEditing(true)}>{value || <span className="text-gray-400">{placeholder || 'Click to edit'}</span>}</div>
      )}
    </div>
  )
}

