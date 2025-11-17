import { exportElementToPDF } from '@utils/pdf'

type PDFButtonProps = {
  targetId: string
  fileName: string
}

export default function PDFButton({ targetId, fileName }: PDFButtonProps): JSX.Element {
  async function handleExport() {
    const el = document.getElementById(targetId)
    if (!el) return
    await exportElementToPDF(el, fileName)
  }

  return (
    <button
      onClick={handleExport}
      className="
        px-5 py-3 rounded-xl font-semibold
        bg-gradient-to-b from-[#ffd700] to-[#b8860b]
        text-black
        shadow-[0_0_15px_rgba(255,215,0,0.35)]
        hover:shadow-[0_0_25px_rgba(255,215,0,0.55)]
        transition-all
        select-none
      "
    >
      Export PDF
    </button>
  )
}
