import { exportElementToPDF } from '@utils/pdf'

export default function PDFButton({ targetId, fileName }:{ targetId: string; fileName: string }){
  return (
    <button className="btn btn-gold btn-lg" onClick={async ()=>{
      const el = document.getElementById(targetId)
      if (!el) return
      await exportElementToPDF(el, fileName)
    }}>Export PDF</button>
  )
}
