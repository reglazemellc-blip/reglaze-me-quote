import { useEffect, useRef } from 'react'
import SignaturePad from 'signature_pad'

export default function SignatureModal({ open, onClose, onSave }:{ open:boolean; onClose:()=>void; onSave:(dataUrl:string)=>void }){
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const padRef = useRef<SignaturePad|null>(null)

  useEffect(()=>{
    if (!open) return
    const canvas = canvasRef.current!
    const pad = new SignaturePad(canvas, { backgroundColor: 'rgb(255,255,255)', penColor: '#000' })
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
    return () => { window.removeEventListener('resize', resize); pad.off() }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="card w-[90vw] max-w-xl p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Signature</h3>
          <button onClick={onClose} className="text-gray-500">✕</button>
        </div>
        <div className="border rounded-lg overflow-hidden h-56">
          <canvas ref={canvasRef} className="w-full h-full" />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button className="btn btn-outline" onClick={()=>padRef.current?.clear()}>Clear</button>
          <button className="btn btn-primary" onClick={()=>{ if (!padRef.current?.isEmpty()) onSave(padRef.current!.toDataURL()) }}>Save</button>
        </div>
      </div>
    </div>
  )
}

