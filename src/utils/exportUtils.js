import * as XLSX from 'xlsx'
import html2canvas from 'html2canvas'

export async function exportAsImage(element, filename = 'dashboard') {
  if (!element) return
  const canvas = await html2canvas(element, {
    backgroundColor: null,
    scale: 2,
    useCORS: true,
    logging: false,
  })
  const link = document.createElement('a')
  link.download = `${filename}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

export function exportChartDataExcel({ metrics, metricsTitle, sheets, filename }) {
  const wb = XLSX.utils.book_new()

  if (metrics) {
    const metricsRows = Object.entries(metrics).map(([key, value]) => ({
      Metric: key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim(),
      Value: value,
    }))
    const ws = XLSX.utils.json_to_sheet(metricsRows)
    ws['!cols'] = [{ wch: 30 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(wb, ws, metricsTitle || 'Summary')
  }

  for (const sheet of sheets) {
    if (sheet.data && sheet.data.length > 0) {
      const ws = XLSX.utils.json_to_sheet(sheet.data)
      const name = sheet.name.replace(/[:\\/?*[\]]/g, '').substring(0, 31)
      XLSX.utils.book_append_sheet(wb, ws, name)
    }
  }

  XLSX.writeFile(wb, `${filename}.xlsx`)
}

export function exportTableData(rows, filename) {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, 'Data')
  XLSX.writeFile(wb, `${filename}.xlsx`)
}
