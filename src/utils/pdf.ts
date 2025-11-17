import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export async function exportElementToPDF(el: HTMLElement, fileName: string) {
  const canvas = await html2canvas(el, { scale: 2, useCORS: true })
  const imgData = canvas.toDataURL('image/png')

  const pdf = new jsPDF('p', 'pt', 'a4')
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  const imgWidth = pageWidth
  const imgHeight = canvas.height * (imgWidth / canvas.width)

  let y = 0
  while (y < imgHeight) {
    if (y > 0) pdf.addPage()
    pdf.addImage(
      imgData,
      'PNG',
      0,
      -y,
      imgWidth,
      imgHeight
    )
    y += pageHeight
  }

  pdf.save(fileName)
}

