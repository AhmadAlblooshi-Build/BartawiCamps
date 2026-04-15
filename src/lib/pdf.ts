import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Brand colors as RGB arrays
const C = {
  dark:    [7,   16,  31]  as [number,number,number],
  card:    [13,  27,  46]  as [number,number,number],
  elevated:[18,  34,  54]  as [number,number,number],
  cyan:    [0,   212, 255] as [number,number,number],
  text:    [232, 244, 253] as [number,number,number],
  muted:   [107, 143, 168] as [number,number,number],
  dim:     [61,  90,  115] as [number,number,number],
  green:   [0,   255, 136] as [number,number,number],
  red:     [255, 68,  68]  as [number,number,number],
  orange:  [255, 107, 0]   as [number,number,number],
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  return n.toLocaleString('en-AE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function addPageHeader(doc: jsPDF, title: string, subtitle: string) {
  doc.setFillColor(...C.dark)
  doc.rect(0, 0, 210, 32, 'F')
  doc.setFillColor(...C.cyan)
  doc.rect(0, 30, 210, 2, 'F')
  // Left: logo
  doc.setTextColor(...C.cyan)
  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.text('BARTAWI', 14, 14)
  doc.setTextColor(...C.muted)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Camp Management System  ·  Dubai, UAE', 14, 21)
  // Right: report title
  doc.setTextColor(...C.text)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 196, 14, { align: 'right' })
  doc.setTextColor(...C.muted)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(subtitle, 196, 22, { align: 'right' })
}

function addFooters(doc: jsPDF) {
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFillColor(...C.card)
    doc.rect(0, 284, 210, 13, 'F')
    doc.setTextColor(...C.dim)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    const ts = new Date().toLocaleString('en-AE', { timeZone: 'Asia/Dubai' })
    doc.text(`Bartawi LLC  ·  Confidential  ·  Generated ${ts} (Dubai)`, 14, 291)
    doc.text(`Page ${i} / ${pages}`, 196, 291, { align: 'right' })
  }
}

function statBox(doc: jsPDF, x: number, y: number, w: number, label: string, value: string, highlight = false) {
  doc.setFillColor(...(highlight ? C.elevated : C.card))
  doc.roundedRect(x, y, w, 24, 2, 2, 'F')
  if (highlight) {
    doc.setDrawColor(...C.cyan)
    doc.setLineWidth(0.3)
    doc.roundedRect(x, y, w, 24, 2, 2, 'S')
  }
  doc.setTextColor(...C.muted)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text(label.toUpperCase(), x + 4, y + 8)
  doc.setTextColor(...C.text)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(value, x + 4, y + 19)
  doc.setFont('helvetica', 'normal')
}

// ── RENT ROLL ──────────────────────────────────────────────────────────────
export function generateRentRollPDF(data: any): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const { camp, period, records, totals } = data
  if (!records?.length) { alert('No records to export'); return }

  const periodLabel = `${MONTHS[period.month - 1]} ${period.year}`
  addPageHeader(doc, 'Rent Roll', `${camp.name}  ·  ${periodLabel}`)

  // Stat boxes
  const bw = 58
  statBox(doc, 14,  38, bw, 'Total Rent',      `AED ${fmt(totals.rent)}`)
  statBox(doc, 76,  38, bw, 'Total Collected',  `AED ${fmt(totals.paid)}`,  true)
  statBox(doc, 138, 38, bw, 'Outstanding',      `AED ${fmt(totals.balance)}`, (totals.balance ?? 0) > 0)

  // Collection rate bar
  const rate = totals.rent > 0 ? (totals.paid / totals.rent) * 100 : 0
  doc.setFillColor(...C.elevated)
  doc.roundedRect(14, 67, 182, 8, 1, 1, 'F')
  doc.setFillColor(...C.green)
  doc.roundedRect(14, 67, Math.min(182, (rate / 100) * 182), 8, 1, 1, 'F')
  doc.setTextColor(...C.muted)
  doc.setFontSize(7)
  doc.text(`Collection rate: ${rate.toFixed(1)}%  ·  ${records.length} rooms`, 14, 81)

  autoTable(doc, {
    startY: 87,
    head: [['Room', 'Block', 'Floor', 'Tenant / Company', 'Type', 'People', 'Rent', 'Paid', 'Balance', 'Remarks']],
    body: records.map((r: any) => [
      r.room_number || '—',
      r.block || '—',
      r.floor || '—',
      r.tenant_name || r.company_name || r.owner_name || '—',
      (r.contract_type || '—').toUpperCase(),
      r.people_count ?? 0,
      fmt(r.rent),
      fmt(r.paid),
      r.balance > 0 ? fmt(r.balance) : '✓',
      r.remarks || '',
    ]),
    headStyles: {
      fillColor: C.card,
      textColor: C.muted,
      fontSize: 7,
      fontStyle: 'bold',
      cellPadding: 2.5,
    },
    bodyStyles: {
      fillColor: C.dark,
      textColor: C.text,
      fontSize: 7.5,
      cellPadding: 2,
    },
    alternateRowStyles: { fillColor: [9, 20, 36] as [number,number,number] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 14 },
      6: { halign: 'right' },
      7: { halign: 'right', textColor: C.green },
      8: { halign: 'right', fontStyle: 'bold' },
      9: { fontSize: 6.5, textColor: C.muted, cellWidth: 28 },
    },
    didParseCell: (d) => {
      if (d.column.index === 8 && d.section === 'body') {
        const raw = records[d.row.index]?.balance ?? 0
        d.cell.styles.textColor = raw > 0 ? C.red : C.muted
      }
    },
    margin: { left: 14, right: 14 },
    tableLineColor: C.elevated,
    tableLineWidth: 0.1,
  })

  addFooters(doc)
  doc.save(`Rent_Roll_${camp.code}_${period.month}_${period.year}.pdf`)
}

// ── OUTSTANDING ────────────────────────────────────────────────────────────
export function generateOutstandingPDF(data: any): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const { camp, period, records, total_outstanding, count } = data
  if (!records?.length) { alert('No outstanding balances to export'); return }

  addPageHeader(doc, 'Outstanding Balances', `${camp.name}  ·  ${MONTHS[period.month - 1]} ${period.year}`)

  // Alert banner
  doc.setFillColor(255, 68, 68, 10)
  doc.setDrawColor(...C.red)
  doc.setLineWidth(0.4)
  doc.roundedRect(14, 38, 182, 22, 2, 2, 'FD')
  doc.setTextColor(...C.red)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(`Total Outstanding: AED ${fmt(total_outstanding)}`, 20, 48)
  doc.setTextColor(...C.muted)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`${count} room${count !== 1 ? 's' : ''} with unpaid balance  ·  Requires immediate attention`, 20, 55)

  autoTable(doc, {
    startY: 68,
    head: [['#', 'Room', 'Block', 'Tenant / Company', 'Contact', 'Rent', 'Paid', 'Balance', 'Remarks']],
    body: records.map((r: any, i: number) => [
      i + 1,
      r.room_number || '—',
      r.block || '—',
      r.tenant_name || '—',
      r.contact || '—',
      fmt(r.rent),
      fmt(r.paid),
      fmt(r.balance),
      r.remarks || '',
    ]),
    headStyles: { fillColor: C.card, textColor: C.muted, fontSize: 7, fontStyle: 'bold', cellPadding: 2.5 },
    bodyStyles: { fillColor: C.dark, textColor: C.text, fontSize: 7.5, cellPadding: 2 },
    alternateRowStyles: { fillColor: [9, 20, 36] as [number,number,number] },
    columnStyles: {
      0: { cellWidth: 8, textColor: C.dim },
      1: { fontStyle: 'bold', cellWidth: 14 },
      5: { halign: 'right' },
      6: { halign: 'right', textColor: C.green },
      7: { halign: 'right', fontStyle: 'bold', textColor: C.red },
      8: { fontSize: 6.5, textColor: C.muted },
    },
    margin: { left: 14, right: 14 },
    tableLineColor: C.elevated,
    tableLineWidth: 0.1,
  })

  addFooters(doc)
  doc.save(`Outstanding_${camp.code}_${period.month}_${period.year}.pdf`)
}

// ── MONTHLY SUMMARY ────────────────────────────────────────────────────────
export function generateSummaryPDF(data: any): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const { camp, period, occupancy, financials } = data

  addPageHeader(doc, 'Monthly Summary', `${camp.name}  ·  ${MONTHS[period.month - 1]} ${period.year}`)

  // Occupancy section
  doc.setTextColor(...C.cyan)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('OCCUPANCY', 14, 44)
  doc.setFillColor(...C.dim)
  doc.rect(14, 45.5, 182, 0.3, 'F')

  const oBoxW = 42
  const oBoxes = [
    { label: 'Total Rooms',    value: String(occupancy.total_rooms) },
    { label: 'Leasable',       value: String(occupancy.leasable_rooms) },
    { label: 'Occupied',       value: String(occupancy.occupied),    hl: true },
    { label: 'Vacant',         value: String(occupancy.vacant) },
    { label: 'Bartawi Use',    value: String(occupancy.bartawi_use) },
  ]
  oBoxes.forEach((b, i) => statBox(doc, 14 + i * (oBoxW + 2), 49, oBoxW, b.label, b.value, b.hl))

  // Occupancy rate visual
  const oRate = occupancy.occupancy_rate ?? 0
  doc.setFillColor(...C.elevated)
  doc.roundedRect(14, 78, 182, 10, 2, 2, 'F')
  doc.setFillColor(...C.green)
  doc.roundedRect(14, 78, (oRate / 100) * 182, 10, 2, 2, 'F')
  doc.setTextColor(...C.dark)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text(`${oRate}% Occupancy Rate`, 18, 85)

  // Financial section
  doc.setTextColor(...C.cyan)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('FINANCIALS', 14, 100)
  doc.setFillColor(...C.dim)
  doc.rect(14, 101.5, 182, 0.3, 'F')

  const fBoxW = 42
  const fBoxes = [
    { label: 'Total Rent',      value: `AED ${fmt(financials.total_rent)}` },
    { label: 'Collected',       value: `AED ${fmt(financials.total_paid)}`,    hl: true },
    { label: 'Outstanding',     value: `AED ${fmt(financials.total_balance)}`, warn: (financials.total_balance ?? 0) > 0 },
    { label: 'Collection Rate', value: `${financials.collection_rate ?? 0}%` },
  ]

  fBoxes.forEach((b, i) => {
    const x = 14 + i * (fBoxW + 2)
    doc.setFillColor(...C.card)
    doc.roundedRect(x, 105, fBoxW, 24, 2, 2, 'F')
    if (b.hl) { doc.setDrawColor(...C.cyan); doc.setLineWidth(0.3); doc.roundedRect(x, 105, fBoxW, 24, 2, 2, 'S') }
    if (b.warn) { doc.setDrawColor(...C.red); doc.setLineWidth(0.3); doc.roundedRect(x, 105, fBoxW, 24, 2, 2, 'S') }
    doc.setTextColor(...C.muted)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(b.label.toUpperCase(), x + 4, 113)
    doc.setTextColor(b.warn ? C.red[0] : C.text[0], b.warn ? C.red[1] : C.text[1], b.warn ? C.red[2] : C.text[2])
    doc.setFontSize(b.value.length > 12 ? 9 : 11)
    doc.setFont('helvetica', 'bold')
    doc.text(b.value, x + 4, 124)
    doc.setFont('helvetica', 'normal')
  })

  // Collection rate bar
  const cRate = financials.collection_rate ?? 0
  doc.setFillColor(...C.elevated)
  doc.roundedRect(14, 134, 182, 10, 2, 2, 'F')
  doc.setFillColor(...C.green)
  doc.roundedRect(14, 134, (cRate / 100) * 182, 10, 2, 2, 'F')
  doc.setTextColor(...C.dark)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text(`${cRate}% Collection Rate`, 18, 141)

  addFooters(doc)
  doc.save(`Summary_${camp.code}_${period.month}_${period.year}.pdf`)
}
