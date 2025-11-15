import { useEffect, useState } from 'react'
import { useSettingsStore } from '@store/useSettingsStore'

export default function SettingsPage() {
  const { settings, init, update } = useSettingsStore()
  const [taxRatePct, setTaxRatePct] = useState(0)

  useEffect(() => { init() }, [init])

  useEffect(() => {
    if (settings)
      setTaxRatePct((settings.defaultTaxRate || 0) * 100)
  }, [settings])

  if (!settings) return null

  return (
    <div className="p-4 md:p-6 space-y-6">

      {/* BUSINESS INFO */}
      <div className="card p-6 rounded-2xl bg-[#101010] border border-[#2a2414] shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
        <h2 className="font-semibold text-[#e8d487] text-lg mb-4">Business Info</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextareaList
            label="Left"
            value={settings.companyLeftLines}
            onChange={(v) => update({ companyLeftLines: v })}
          />
          <TextareaList
            label="Right"
            value={settings.companyRightLines}
            onChange={(v) => update({ companyRightLines: v })}
          />
        </div>
      </div>

      {/* DEFAULTS */}
      <div className="card p-6 rounded-2xl bg-[#101010] border border-[#2a2414] shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
        <h2 className="font-semibold text-[#e8d487] text-lg mb-4">Defaults</h2>

        <label className="label text-[#e8d487]/80 text-sm">
          Default Tax Rate (%)
          <input
            className="input mt-1"
            type="number"
            value={taxRatePct}
            onChange={e => setTaxRatePct(Number(e.target.value))}
            onBlur={() => update({ defaultTaxRate: taxRatePct / 100 })}
          />
        </label>

        {/* WATERMARK */}
        <div className="mt-6">
          <div className="label text-[#e8d487]/80 mb-1">PDF Watermark</div>

          <div className="flex items-center gap-4">
            <input
              type="file"
              accept="image/*"
              className="text-xs text-gray-400"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (!f) return
                const dataUrl = await fileToDataUrl(f)
                await update({ watermark: dataUrl })
              }}
            />

            {settings.watermark && (
              <img
                src={settings.watermark}
                className="h-12 w-auto rounded shadow"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function TextareaList({
  label,
  value,
  onChange,
}: {
  label: string
  value: string[]
  onChange: (v: string[]) => void
}) {
  return (
    <label className="label text-[#e8d487]/80 text-sm">
      {label}
      <textarea
        className="input h-32 mt-1"
        value={value.join('\n')}
        onChange={(e) => onChange(e.target.value.split('\n'))}
      />
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
