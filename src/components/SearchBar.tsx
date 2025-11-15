import { useState } from 'react'

type SearchBarProps = {
  placeholder?: string
  onChange: (v: string) => void
}

export default function SearchBar({ placeholder, onChange }: SearchBarProps): JSX.Element {
  const [value, setValue] = useState('')

  function handleChange(v: string) {
    setValue(v)
    onChange(v)
  }

  function clear() {
    setValue('')
    onChange('')
  }

  return (
    <div className="relative w-full">
      <input
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder || 'Search...'}
        className="
          w-full px-4 py-2 rounded-xl
          bg-[#151515]
          border border-[#2a2a2a]
          text-[#e8d487]
          placeholder:text-[#777]
          shadow-[0_0_10px_rgba(255,215,0,0.12)]
          focus:shadow-[0_0_18px_rgba(255,215,0,0.35)]
          transition-all
          focus:outline-none
        "
      />

      {value && (
        <button
          onClick={clear}
          className="
            absolute right-3 top-1/2 -translate-y-1/2
            text-[#e8d487]/60
            hover:text-[#fff1a8]
            transition-all
            text-sm
          "
        >
          Clear
        </button>
      )}
    </div>
  )
}
