import { useState } from 'react'

type InlineEditableTextProps = {
  value?: string
  onSave: (v: string) => void
  className?: string
  placeholder?: string
}

export default function InlineEditableText({
  value,
  onSave,
  className,
  placeholder
}: InlineEditableTextProps): JSX.Element {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(value || '')

  return (
    <div className={className}>
      {editing ? (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            className="
              px-3 py-2 rounded-lg w-full
              bg-[#151515]
              border border-[#2a2a2a]
              text-[#e8d487]
              focus:outline-none
              shadow-[0_0_8px_rgba(255,215,0,0.15)]
              focus:shadow-[0_0_12px_rgba(255,215,0,0.35)]
              transition-all
            "
          />

          {/* SAVE BUTTON */}
          <button
            onClick={() => {
              onSave(text)
              setEditing(false)
            }}
            className="
              px-3 py-2 rounded-lg
              bg-gradient-to-b from-[#ffd700] to-[#b8860b]
              text-black font-semibold
              hover:opacity-90
              transition-all
              shadow-[0_0_10px_rgba(255,215,0,0.35)]
            "
          >
            Save
          </button>

          {/* CANCEL BUTTON */}
          <button
            onClick={() => {
              setText(value || '')
              setEditing(false)
            }}
            className="
              px-3 py-2 rounded-lg
              border border-[#444]
              text-[#e8d487]/70
              hover:text-[#fff1a8]
              hover:border-[#b8860b]
              transition-all
            "
          >
            Cancel
          </button>
        </div>
      ) : (
        <div
          className="
            cursor-text select-none
            text-[#e8d487]
            hover:text-[#fff1a8]
            transition-all
          "
          onClick={() => setEditing(true)}
        >
          {value || (
            <span className="text-[#666]">
              {placeholder || 'Click to edit'}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
