import jsPDF from 'jspdf'

export type PDF = jsPDF

export interface LetterheadOptions {
  title: string
  subtitle?: string
  period?: string
}

export function createDoc(opts: LetterheadOptions): PDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const w = doc.internal.pageSize.getWidth()

  // Background tint
  doc.setFillColor(250, 247, 242)
  doc.rect(0, 0, w, doc.internal.pageSize.getHeight(), 'F')

  // Letterhead
  doc.setFillColor(26, 24, 22)
  doc.rect(0, 0, w, 60, 'F')
  doc.setTextColor(250, 247, 242)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bolditalic')
  doc.text('Bartawi', 40, 38)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(184, 136, 61)
  doc.text('LABOUR CAMP MANAGEMENT', 40, 51)

  if (opts.period) {
    doc.setTextColor(180, 170, 155)
    doc.setFontSize(9)
    doc.text(opts.period, w - 40, 38, { align: 'right' })
  }

  // Title
  doc.setTextColor(26, 24, 22)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(opts.title, 40, 95)

  if (opts.subtitle) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(106, 97, 89)
    doc.text(opts.subtitle, 40, 112)
  }

  // Divider
  doc.setDrawColor(200, 190, 175)
  doc.setLineWidth(0.5)
  doc.line(40, 130, w - 40, 130)

  return doc
}

export function addFooter(doc: PDF, pageNum: number, pageCount: number) {
  const w = doc.internal.pageSize.getWidth()
  const h = doc.internal.pageSize.getHeight()
  doc.setFontSize(8)
  doc.setTextColor(120, 110, 100)
  doc.text(`Page ${pageNum} of ${pageCount}`, w - 40, h - 20, { align: 'right' })
  doc.text(`Generated ${new Date().toLocaleString('en-AE', { timeZone: 'Asia/Dubai' })}`, 40, h - 20)
}

export function download(doc: PDF, filename: string) {
  doc.save(filename)
}

export function fmtAED(n: number | string | null | undefined): string {
  const v = Number(n || 0)
  return new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 }).format(v)
}

export function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB')
}

export function monthLabel(month: number, year: number): string {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${MONTHS[month - 1]} ${year}`
}
