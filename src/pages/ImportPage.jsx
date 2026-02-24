import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import BentoCard from '../components/BentoCard/BentoCard'
import { importFromExcel } from '../data/excelImporter'
import { importFromJSON } from '../data/jsonSync'
import './ImportPage.css'

export default function ImportPage() {
  const navigate = useNavigate()
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const excelRef = useRef(null)
  const jsonRef = useRef(null)

  const handleExcelImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setImporting(true)
    setError(null)
    setResult(null)

    try {
      const res = await importFromExcel(file)
      setResult({
        type: 'excel',
        ...res,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setImporting(false)
      if (excelRef.current) excelRef.current.value = ''
    }
  }

  const handleJSONImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setImporting(true)
    setError(null)
    setResult(null)

    try {
      const res = await importFromJSON(file)
      setResult({
        type: 'json',
        ...res,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setImporting(false)
      if (jsonRef.current) jsonRef.current.value = ''
    }
  }

  return (
    <div className="import-page">
      <h2 className="import-title">Import Data</h2>

      <div className="import-cards">
        <BentoCard title="Import from Excel">
          <p className="import-description">
            Import historical cost-share data from the SDSHC Excel database
            (Peoples Database Queries). This will read the Cost-share History tab
            and create producer, contract, BMP, and practice records.
          </p>
          <p className="import-warning">
            This will replace any existing data in the database.
          </p>
          <label className="import-btn">
            {importing ? 'Importing...' : 'Select Excel File (.xlsx)'}
            <input
              ref={excelRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleExcelImport}
              disabled={importing}
              style={{ display: 'none' }}
            />
          </label>
        </BentoCard>

        <BentoCard title="Import from JSON Backup">
          <p className="import-description">
            Restore from a previously exported JSON backup file.
            This will replace all current data with the backup contents.
          </p>
          <label className="import-btn import-btn-secondary">
            {importing ? 'Importing...' : 'Select JSON File'}
            <input
              ref={jsonRef}
              type="file"
              accept=".json"
              onChange={handleJSONImport}
              disabled={importing}
              style={{ display: 'none' }}
            />
          </label>
        </BentoCard>
      </div>

      {importing && (
        <div className="import-status">
          <div className="app-loading-spinner" />
          <span>Importing data, please wait...</span>
        </div>
      )}

      {error && (
        <div className="import-error">
          <strong>Import failed:</strong> {error}
        </div>
      )}

      {result && (
        <div className="import-success">
          <strong>Import complete!</strong>
          {result.type === 'excel' ? (
            <ul>
              <li>{result.producersImported} producers</li>
              <li>{result.contractsImported} contracts</li>
              <li>{result.bmpsImported} BMPs</li>
              <li>{result.totalRows} total rows processed</li>
            </ul>
          ) : (
            <ul>
              <li>{result.tablesImported} tables imported</li>
              <li>{result.totalRecords} total records</li>
            </ul>
          )}
          <button
            className="import-nav-btn"
            onClick={() => navigate('/producers')}
          >
            View Producers
          </button>
        </div>
      )}
    </div>
  )
}
