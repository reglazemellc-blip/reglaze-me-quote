import { useEffect, useRef } from 'react'
import SignaturePad from 'signature_pad'

type SignatureModalProps = {
  open: boolean
  onClose: () => void
  onSave: (dataUrl: string) => void
}

export default function SignatureModal({
  open,
  onClose,
  onSave
}: SignatureModalProps): JSX.Element | null {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const padRef = useRef<SignaturePad | null>(null)

  useEffect(() => {
    if (!open) return

    const canvas = canvasRef.current!
    const pad = new SignaturePad(canvas, {
      backgroundColor: '#ffffff',
      penColor: '#000'
    })

    padRef.current = pad

    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1)
      canvas.width = canvas.offsetWidth * ratio
      canvas.height = canvas.offsetHeight * ratio
      canvas.getContext('2d')!.scale(ratio, ratio)
      pad.clear()
    }

    resize()
    window.addEventListener('resize', resize)

    return () => {
      window.removeEventListener('resize', resize)
      pad.off()
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="
        fixed inset-0 z-50
        bg-black/60 backdrop-blur-sm
        flex items-center justify-center
      "
    >
      <div
        className="
          w-[90vw] max-w-xl p-6 rounded-2xl
          bg-[#151515]
          border border-[#2a2a2a]
          shadow-[0_0_35px_rgba(255,215,0,0.25)]
          text-[#e8d487]
        "
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[#fff1a8]">Signature</h3>
          <button
            onClick={onClose}
            className="
              text-[#e8d487]/70
              hover:text-[#fff1a8]
              transition-all text-xl
            "
          >
            ✕
          </button>
        </div>

        <div
          className="
            border border-[#2a2a2a] rounded-xl
            overflow-hidden h-56
            bg-white
          "
        >
          <canvas ref={canvasRef} className="w-full h-full" />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            className="
              flex-1 px-3 py-2 rounded-lg
              border border-[#444]
              text-[#e8d487]/70
              hover:text-[#fff1a8]
              hover:border-[#b8860b]
              transition-all
            "
            onClick={() => padRef.current?.clear()}
          >
            Clear
          </button>

          <button
            className="
              flex-1 px-3 py-2 rounded-lg font-semibold
              bg-gradient-to-b from-[#ffd700] to-[#b8860b]
              text-black
              shadow-[0_0_15px_rgba(255,215,0,0.35)]
              hover:opacity-90
              transition-all
            "
            onClick={() => {
              const pad = padRef.current
              if (!pad || pad.isEmpty()) return

              const dataUrl = pad.toDataURL()
              onSave(dataUrl)
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
