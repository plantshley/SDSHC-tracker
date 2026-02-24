import { useState } from 'react'
import BentoCard from '../components/BentoCard/BentoCard'
import { downloadJSON } from '../data/jsonSync'
import { exportTableData } from '../utils/exportUtils'
import db from '../data/db'

export default function ExportPage() {
  const [exporting, setExporting] = useState(false)

  const handleJSONExport = async () => {
    setExporting(true)
    try {
      await downloadJSON()
    } finally {
      setExporting(false)
    }
  }

  const handleExcelExport = async () => {
    setExporting(true)
    try {
      const producers = await db.producers.toArray()
      const contracts = await db.contracts.toArray()
      const bmps = await db.bmps.toArray()
      const practices = await db.practices.toArray()
      const funds = await db.funds.toArray()
      const bills = await db.bills.toArray()

      // Build flat export rows
      const rows = []
      for (const producer of producers) {
        const pContracts = contracts.filter((c) => c.producerId === producer.id)
        for (const contract of pContracts) {
          const cBmps = bmps.filter((b) => b.contractId === contract.id)
          for (const bmp of cBmps) {
            const bPractices = practices.filter((p) => p.bmpId === bmp.id)
            for (const practice of bPractices) {
              const pBills = bills.filter((b) => b.practiceId === practice.id)
              const pFunds = funds.filter((f) => pBills.some((b) => b.id === f.billId))
              const amount319 = pFunds.filter((f) => f.fundName === '319').reduce((s, f) => s + f.amount, 0)
              const amountOther = pFunds.filter((f) => f.fundName === 'Other').reduce((s, f) => s + f.amount, 0)
              const amountLocal = pFunds.filter((f) => f.fundName === 'Local').reduce((s, f) => s + f.amount, 0)

              rows.push({
                'Producer': `${producer.firstName} ${producer.lastName}`,
                'Farm Name': producer.farmName,
                'Contract': contract.contractNumber,
                'BMP': bmp.type,
                'BMP Code': bmp.bmpCode,
                'Practice': practice.practiceType,
                'Acres': practice.acres,
                'Completion Date': practice.completionDate,
                '319 Amount': amount319,
                'Other Amount': amountOther,
                'Local Amount': amountLocal,
                'Total': amount319 + amountOther + amountLocal,
                'Lat': bmp.lat,
                'Long': bmp.lng,
                'Stream': bmp.streamArea,
              })
            }
          }
        }
      }

      exportTableData(rows, 'sdshc-tracker-export')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>
        Export Data
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        <BentoCard title="JSON Backup">
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
            Export the complete database as a JSON file. Use this for backups
            and sharing data between users.
          </p>
          <button
            onClick={handleJSONExport}
            disabled={exporting}
            style={{
              padding: '10px 24px', background: 'var(--accent)', color: 'white',
              border: 'none', borderRadius: 10, fontFamily: 'var(--font-heading)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: exporting ? 0.6 : 1,
            }}
          >
            {exporting ? 'Exporting...' : 'Download JSON Backup'}
          </button>
        </BentoCard>

        <BentoCard title="Excel Export">
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
            Export all data as a flat Excel spreadsheet with producer, contract,
            BMP, practice, and funding information.
          </p>
          <button
            onClick={handleExcelExport}
            disabled={exporting}
            style={{
              padding: '10px 24px', background: 'transparent', color: 'var(--accent)',
              border: '1px solid var(--accent)', borderRadius: 10, fontFamily: 'var(--font-heading)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: exporting ? 0.6 : 1,
            }}
          >
            {exporting ? 'Exporting...' : 'Download Excel File'}
          </button>
        </BentoCard>
      </div>
    </div>
  )
}
