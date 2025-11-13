import { useState } from 'react'

export default function SearchBar({ placeholder, onChange }: { placeholder?: string; onChange: (v: string)=>void }){
  const [v, setV] = useState('')
  return (
    <div className="relative w-full">
      <input className="input" placeholder={placeholder || 'Search...'} value={v} onChange={(e)=>{ setV(e.target.value); onChange(e.target.value) }} />
      {v && <button className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500" onClick={()=>{ setV(''); onChange('') }}>Clear</button>}
    </div>
  )
}

