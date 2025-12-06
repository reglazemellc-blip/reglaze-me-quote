import { useRef, useState } from 'react'
import { useSettingsStore } from '@store/useSettingsStore'

type ThemeEditorProps = {
  onClose: () => void
}

export default function ThemeEditor({
  onClose
}: ThemeEditorProps): JSX.Element | null {
  const { settings, update, exportJSON, importJSON } = useSettingsStore()

  const [left, setLeft] = useState(settings?.companyLeftLines || [])
  const [right, setRight] = useState(settings?.companyRightLines || [])
  const fileRef = useRef<HTMLInputElement>(null)

  if (!settings) return null

  const theme = settings.theme

  return (
    <div
      className="
        fixed inset-0 z-50
        bg-black/50 backdrop-blur
        flex items-center justify-center
        p-5
      "
    >
      <div
        className="
         w-full max-w-2xl p-7 rounded-2xl relative
          bg-[#151515]
          border border-[#242424]
          shadow-[0_0_30px_rgba(255,215,0,0.20)]
          text-[#e8d487]
        "
      >
        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          className="
            absolute right-4 top-2.5 text-xl
            text-[#e8d487]/85
            hover:text-[#fff1a8]
            transition-all
          "
        >
          ✕
        </button>

        <h2 className="text-xl font-semibold text-[#f7e89c] mt-1 mb-8">

          Admin Edit Mode
        </h2>

        {/* COLOR CUSTOMIZATION */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <ColorField
            label="Primary"
            value={theme.primary}
            onChange={(v) => update({ theme: { ...theme, primary: v } })}
          />
          <ColorField
            label="Secondary"
            value={theme.secondary}
            onChange={(v) => update({ theme: { ...theme, secondary: v } })}
          />
          <ColorField
            label="Accent 1"
            value={theme.accent1}
            onChange={(v) => update({ theme: { ...theme, accent1: v } })}
          />
          <ColorField
            label="Accent 2"
            value={theme.accent2}
            onChange={(v) => update({ theme: { ...theme, accent2: v } })}
          />
          <ColorField
            label="Background"
            value={theme.background}
            onChange={(v) => update({ theme: { ...theme, background: v } })}
          />
        </div>

        {/* COMPANY INFO EDITORS */}
        <div className="mt-9 grid grid-cols-1 md:grid-cols-2 gap-7">
          <LineEditor
            title="Company Left"
            lines={left}
            setLines={setLeft}
            onSave={() => update({ companyLeftLines: left })}
          />

          <LineEditor
            title="Company Right"
            lines={right}
            setLines={setRight}
            onSave={() => update({ companyRightLines: right })}
          />
        </div>

        {/* IMPORT / EXPORT JSON */}
        <div className="mt-9 flex items-center gap-4">
          <button
            className="
              px-4 py-2 rounded-xl shadow-sm
              border border-[#505050]
              text-[#e8d487]/80
              hover:text-[#fff1a8]
              hover:border-[#b8860b]
              transition-all
            "
            onClick={async () => {
              const blob = await exportJSON()
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'reglaze-data.json'
              a.click()
              URL.revokeObjectURL(url)
            }}
          >
            Export JSON
          </button>

          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              const text = await file.text()
              await importJSON(JSON.parse(text))
              alert('Import successful.')

            }}
          />

          <button
            className="
              px-5 py-2 rounded-xl
              border border-[#505050]
              text-[#e8d487]/80
              hover:text-[#fff1a8]
              hover:border-[#b8860b]
              transition-all
            "
            onClick={() => fileRef.current?.click()}
          >
            Import JSON
          </button>
        </div>
      </div>
    </div>
  )
}

/* --------------------------------------------------
   COLOR FIELD
-------------------------------------------------- */
type ColorFieldProps = {
  label: string
  value: string
  onChange: (v: string) => void
}

function ColorField({ label, value, onChange }: ColorFieldProps): JSX.Element {
  return (
    <label
      className="
        flex items-center gap-4
        bg-[#0f0f0f]
        border border-[#2a2a2a]
        rounded-xl p-4
      "
    >
      <span className="w-28 text-[#fff1a8] font-medium">{label}</span>

      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-11 h-11 rounded-md border border-[#444] cursor-pointer"
      />

      <input
        className="
          flex-1 px-3 py-[10px] rounded-lg
          bg-[#1b1b1b]
          border border-[#2a2a2a]
          text-[#e8d487] placeholder:text-[#a08f55]/60
          focus:outline-none
        "
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

/* --------------------------------------------------
   LINE EDITOR
-------------------------------------------------- */
type LineEditorProps = {
  title: string
  lines: string[]
  setLines: (v: string[]) => void
  onSave: () => void
}

function LineEditor({
  title,
  lines,
  setLines,
  onSave
}: LineEditorProps): JSX.Element {
  return (
    <div
      className="
        bg-[#0f0f0f]
        border border-[#2a2a2a]
        p-5 rounded-xl
        text-[#e8d487]
      "
    >
      <div className="font-semibold text-[#fff1a8] mb-4">{title}</div>

      {lines.map((line, i) => (
        <input
          key={i}
          value={line}
          onChange={(e) => {
            const next = [...lines]
            next[i] = e.target.value
            setLines(next)
          }}
          className="
            w-full mb-1 px-3 py-[10px] rounded-lg
            bg-[#1b1b1b]
            border border-[#2a2a2a]
            text-[#e8d487]
            focus:outline-none
          "
        />
      ))}

      <div className="flex items-center gap-3 mt-4">
        <button
          className="
           px-3 py-2 rounded-lg font-semibold text-[0.95rem]
            bg-gradient-to-b from-[#ffd700] to-[#b8860b]
            text-black
            shadow-[0_0_12px_rgba(255,215,0,0.35)]
            hover:opacity-90
            transition-all
          "
          onClick={() => {
            setLines(lines.filter((l) => l.trim().length))
            onSave()
          }}
        >
          Save
        </button>

        <button
          className="
            px-4 py-2 rounded-lg
            border border-[#444]
            text-[#e8d487]/70
            hover:text-[#fff1a8]
            hover:border-[#b8860b]
            transition-all
          "
          onClick={() => setLines([...lines, ''])}
        >
          Add Line
        </button>
      </div>
    </div>
  )
}
