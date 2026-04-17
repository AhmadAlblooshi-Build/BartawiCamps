import { createDoc, addFooter, download } from './base'

export function generateOccupancyReport(params: { camps: any[] }) {
  const doc = createDoc({
    title: 'Occupancy report',
    subtitle: 'Current state — by block and property type',
    period: new Date().toLocaleDateString('en-GB'),
  })

  const w = doc.internal.pageSize.getWidth()
  let y = 160

  params.camps.forEach((camp: any) => {
    if (y > 680) { doc.addPage(); doc.setFillColor(250,247,242); doc.rect(0,0,w,doc.internal.pageSize.getHeight(),'F'); y = 50 }

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(26, 24, 22)
    doc.text(camp.name, 40, y)
    y += 22

    // By property type
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(120, 110, 100)
    doc.text('BY PROPERTY TYPE', 40, y, { charSpace: 1 })
    y += 14
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(26, 24, 22)
    camp.by_property_type?.forEach((row: any) => {
      doc.text(row.name, 50, y)
      doc.text(String(row.count), 220, y, { align: 'right' })
      const pct = ((row.count / (camp.total || 1)) * 100).toFixed(1)
      doc.text(`${pct}%`, 260, y, { align: 'right' })
      // Mini bar
      const barW = 180
      const barFill = (row.count / (camp.total || 1)) * barW
      doc.setFillColor(232, 223, 209)
      doc.roundedRect(280, y - 7, barW, 6, 2, 2, 'F')
      doc.setFillColor(184, 136, 61)
      doc.roundedRect(280, y - 7, barFill, 6, 2, 2, 'F')
      y += 14
    })
    y += 12

    // By block
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(120, 110, 100)
    doc.text('BY BLOCK', 40, y, { charSpace: 1 })
    y += 14
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(26, 24, 22)
    camp.by_block?.forEach((b: any) => {
      doc.text(`Block ${b.code}`, 50, y)
      doc.text(`${b.occupied}/${b.total}`, 150, y, { align: 'right' })
      const pct = b.total ? ((b.occupied / b.total) * 100).toFixed(1) : '0.0'
      doc.text(`${pct}%`, 200, y, { align: 'right' })
      y += 14
    })
    y += 24
  })

  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) { doc.setPage(i); addFooter(doc, i, pages) }
  download(doc, `occupancy-${new Date().toISOString().slice(0, 10)}.pdf`)
}
