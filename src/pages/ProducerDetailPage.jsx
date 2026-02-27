import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import BentoCard from '../components/BentoCard/BentoCard'
import { formatCurrencyFull, formatDate, formatNumber } from '../utils/formatters'
import db from '../data/db'
import './ProducerDetailPage.css'

function EditableField({ label, value, onSave, type = 'text' }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')

  const handleSave = () => {
    onSave(draft)
    setEditing(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') { setDraft(value || ''); setEditing(false) }
  }

  return (
    <div className="info-field">
      <label>{label}</label>
      {editing ? (
        <div className="editable-input-row">
          <input
            type={type}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="editable-input"
            autoFocus
          />
        </div>
      ) : (
        <span
          className="editable-value"
          onClick={() => { setDraft(value || ''); setEditing(true) }}
          title="Click to edit"
        >
          {value || '—'}
          <span className="edit-icon">&#9998;</span>
        </span>
      )}
    </div>
  )
}

export default function ProducerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [producer, setProducer] = useState(null)
  const [contracts, setContracts] = useState([])
  const [bmps, setBmps] = useState([])
  const [practices, setPractices] = useState([])
  const [bills, setBills] = useState([])
  const [funds, setFunds] = useState([])
  const [combinedReductions, setCombinedReductions] = useState([])
  const [npsReductions, setNpsReductions] = useState([])
  const [producerFiles, setProducerFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const fileInputRef = useRef(null)

  const loadData = useCallback(async () => {
    const p = await db.producers.get(Number(id))
    if (!p) { setLoading(false); return }
    setProducer(p)

    const c = await db.contracts.where('producerId').equals(p.id).toArray()
    setContracts(c)

    const contractIds = c.map((x) => x.id)
    const b = contractIds.length > 0
      ? await db.bmps.where('contractId').anyOf(contractIds).toArray()
      : []
    setBmps(b)

    // Load combined NPS reductions for all contracts
    const combined = contractIds.length > 0
      ? await db.npsReductionsCombined.where('contractId').anyOf(contractIds).toArray()
      : []
    setCombinedReductions(combined)

    const bmpIds = b.map((x) => x.id)
    const pr = bmpIds.length > 0
      ? await db.practices.where('bmpId').anyOf(bmpIds).toArray()
      : []
    setPractices(pr)

    // Load per-practice NPS reductions
    const practiceIds = pr.map((x) => x.id)
    const nps = practiceIds.length > 0
      ? await db.npsReductions.where('practiceId').anyOf(practiceIds).toArray()
      : []
    setNpsReductions(nps)
    const bi = practiceIds.length > 0
      ? await db.bills.where('practiceId').anyOf(practiceIds).toArray()
      : []
    setBills(bi)

    const billIds = bi.map((x) => x.id)
    const fu = billIds.length > 0
      ? await db.funds.where('billId').anyOf(billIds).toArray()
      : []
    setFunds(fu)

    // Load producer files
    const files = await db.producerFiles.where('producerId').equals(p.id).toArray()
    setProducerFiles(files)

    setLoading(false)
  }, [id])

  useEffect(() => { loadData() }, [loadData])

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return

    for (const file of files) {
      const reader = new FileReader()
      const dataUrl = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result)
        reader.readAsDataURL(file)
      })

      await db.producerFiles.add({
        producerId: Number(id),
        fileName: file.name,
        fileType: file.type,
        dataUrl,
        uploadDate: new Date().toISOString(),
        notes: '',
      })
    }

    // Reload files
    const updated = await db.producerFiles.where('producerId').equals(Number(id)).toArray()
    setProducerFiles(updated)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDeleteFile = async (fileId) => {
    await db.producerFiles.delete(fileId)
    setProducerFiles((prev) => prev.filter((f) => f.id !== fileId))
  }

  const handleDownloadFile = (file) => {
    const a = document.createElement('a')
    a.href = file.dataUrl
    a.download = file.fileName
    a.click()
  }

  const updateProducerField = async (field, value) => {
    await db.producers.update(Number(id), { [field]: value })
    setProducer((prev) => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div className="app-loading">
        <div className="app-loading-spinner" />
        <span>Loading producer...</span>
      </div>
    )
  }

  if (!producer) {
    return (
      <div className="app-error">
        <p>Producer not found.</p>
        <button onClick={() => navigate('/producers')} style={{ marginTop: 12, padding: '8px 20px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
          Back to Producers
        </button>
      </div>
    )
  }

  const totalFunding = funds.reduce((sum, f) => sum + (f.amount || 0), 0)
  const totalAcres = practices.reduce((sum, p) => sum + (p.acres || 0), 0)

  return (
    <div className="producer-detail-page">
      <button className="back-btn" onClick={() => navigate('/producers')}>
        &larr; Back to Producers
      </button>

      <div className="producer-detail-header">
        <div>
          <div className="producer-detail-title-row">
            {(producer.costShareUrl || producer.recordUrl) ? (
              <a href={producer.costShareUrl || producer.recordUrl} target="_blank" rel="noopener noreferrer" className="producer-detail-farm producer-detail-farm-link">
                {producer.farmName || producer.firstName + ' ' + producer.lastName}
              </a>
            ) : (
              <h2 className="producer-detail-farm">{producer.farmName || 'No Farm Name'}</h2>
            )}
            {producer.isSegmentContact && (
              <span className="imported-tag seg-contact-tag">Segment Contact</span>
            )}
            {producer.isImported && !producer.isSegmentContact && (
              <span className="imported-tag">Historical Import</span>
            )}
          </div>
          <p className="producer-detail-name">{producer.firstName} {producer.lastName}</p>
        </div>
        <div className="producer-detail-stats">
          <div className="producer-stat">
            <span className="producer-stat-value">{formatCurrencyFull(producer.lifetimeCostshareTotal || totalFunding)}</span>
            <span className="producer-stat-label">Total Funding</span>
          </div>
          <div className="producer-stat">
            <span className="producer-stat-value">{formatNumber(producer.lifetimeTotalAcres || totalAcres)}</span>
            <span className="producer-stat-label">Total Acres</span>
          </div>
        </div>
      </div>

      <BentoCard title="Contact Information">
        <div className="producer-info-grid">
          <EditableField label="First Name" value={producer.firstName} onSave={(v) => updateProducerField('firstName', v)} />
          <EditableField label="Last Name" value={producer.lastName} onSave={(v) => updateProducerField('lastName', v)} />
          <EditableField label="Farm Name" value={producer.farmName} onSave={(v) => updateProducerField('farmName', v)} />
          <EditableField label="Address" value={producer.address} onSave={(v) => updateProducerField('address', v)} />
          {producer.address2 && (
            <EditableField label="Address 2" value={producer.address2} onSave={(v) => updateProducerField('address2', v)} />
          )}
          <EditableField label="City" value={producer.city} onSave={(v) => updateProducerField('city', v)} />
          <EditableField label="State" value={producer.state} onSave={(v) => updateProducerField('state', v)} />
          <EditableField label="Zip" value={producer.zip} onSave={(v) => updateProducerField('zip', v)} />
          <EditableField label="Phone" value={producer.phone} onSave={(v) => updateProducerField('phone', v)} type="tel" />
          <EditableField label="Email" value={producer.email} onSave={(v) => updateProducerField('email', v)} type="email" />
          <div className="info-field">
            <label>Person ID</label>
            <span>{producer.personID || '—'}</span>
          </div>
        </div>
      </BentoCard>

      <h3 className="section-heading">Contracts ({contracts.length})</h3>

      {contracts.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13, fontFamily: 'var(--font-body)' }}>No contracts found.</p>
      ) : (
        contracts.map((contract) => {
          const contractBmps = bmps.filter((b) => b.contractId === contract.id)
          const contractPractices = practices.filter((p) => contractBmps.some((b) => b.id === p.bmpId))
          const contractBills = bills.filter((b) => contractPractices.some((p) => p.id === b.practiceId))
          const contractFunds = funds.filter((f) => contractBills.some((b) => b.id === f.billId))
          const contractTotal = contractFunds.reduce((sum, f) => sum + (f.amount || 0), 0)

          // Combined NPS reductions for this contract
          const contractCombined = combinedReductions.filter((r) => r.contractId === contract.id)
          const nCombined = contractCombined.find((r) => r.pollutant === 'N')
          const pCombined = contractCombined.find((r) => r.pollutant === 'P')
          const sCombined = contractCombined.find((r) => r.pollutant === 'S')

          // Get first location from BMPs for this contract
          const locationBmp = contractBmps.find((b) => b.lat && b.lng)

          return (
            <BentoCard key={contract.id} title={`Contract ${contract.contractNumber || contract.id}`}>
              <div className="contract-meta">
                <span>Start: {formatDate(contract.startDate)}</span>
                <span>End: {formatDate(contract.endDate)}</span>
                <span>Total: {formatCurrencyFull(contractTotal)}</span>
              </div>

              {/* Location info */}
              {locationBmp && (
                <div className="contract-section">
                  <h4 className="subsection-heading">Location</h4>
                  <div className="location-list">
                    <div className="location-item">
                      <span className="location-coords">{locationBmp.lat.toFixed(4)}, {locationBmp.lng.toFixed(4)}</span>
                      {locationBmp.streamArea && <span className="location-stream">{locationBmp.streamArea}</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* Combined NPS Reductions */}
              {(nCombined || pCombined || sCombined) && (
                <div className="contract-section">
                  <h4 className="subsection-heading">Combined NPS Reductions</h4>
                  <div className="nps-grid">
                    {nCombined && (
                      <div className="nps-item">
                        <span className="nps-label">Nitrogen</span>
                        <span className="nps-value">{formatNumber(nCombined.quantity)}</span>
                        <span className="nps-unit">{nCombined.unit}</span>
                      </div>
                    )}
                    {pCombined && (
                      <div className="nps-item">
                        <span className="nps-label">Phosphorus</span>
                        <span className="nps-value">{formatNumber(pCombined.quantity)}</span>
                        <span className="nps-unit">{pCombined.unit}</span>
                      </div>
                    )}
                    {sCombined && (
                      <div className="nps-item">
                        <span className="nps-label">Sediment</span>
                        <span className="nps-value">{formatNumber(sCombined.quantity)}</span>
                        <span className="nps-unit">{sCombined.unit}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {contractBmps.length > 0 && (
                <div className="contract-section">
                  <h4 className="subsection-heading">BMPs ({contractBmps.length})</h4>
                  {contractBmps.map((bmp) => {
                    const bmpPractices = practices.filter((p) => p.bmpId === bmp.id)
                    const bmpLabel = [bmp.type, bmp.practiceCode || bmpPractices[0]?.practiceCode].filter(Boolean).join(', ')
                    const bmpIdLabel = bmp.bmpCode ? ` (${bmp.bmpCode})` : ''
                    return (
                      <div key={bmp.id} className="bmp-item">
                        <div className="bmp-item-header">
                          <span className="bmp-type">{bmpLabel || 'Unknown BMP'}{bmpIdLabel}</span>
                          <div className="bmp-meta">
                            {bmp.completionDate && (
                              <span className="bmp-date">Completed: {formatDate(bmp.completionDate)}</span>
                            )}
                          </div>
                        </div>
                        {bmpPractices.length > 0 && (
                          <div className="bmp-practices">
                            {bmpPractices.map((pr) => {
                              const prNps = npsReductions.filter((n) => n.practiceId === pr.id)
                              const npsText = prNps.map((n) => `${n.pollutant}: ${formatNumber(n.quantity)}`).join(' · ')
                              const prBills = bills.filter((b) => b.practiceId === pr.id)
                              const prFunds = funds.filter((f) => prBills.some((b) => b.id === f.billId))
                              const prTotal = prFunds.reduce((sum, f) => sum + (f.amount || 0), 0)
                              return (
                                <div key={pr.id} className="practice-row">
                                  <span className="practice-acres">{pr.acres ? `${pr.acres} ac` : ''}</span>
                                  {npsText && <span className="practice-nps">{npsText}</span>}
                                  {prTotal > 0 && <span className="practice-amount">{formatCurrencyFull(prTotal)}</span>}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </BentoCard>
          )
        })
      )}

      <BentoCard title="Files &amp; Documents">
        {producerFiles.length > 0 && (
          <div className="file-list">
            {producerFiles.map((file) => {
              const isImage = file.fileType?.startsWith('image/')
              return (
                <div key={file.id} className="file-item">
                  {isImage && (
                    <img src={file.dataUrl} alt={file.fileName} className="file-thumbnail" />
                  )}
                  <div className="file-info">
                    <span className="file-name">{file.fileName}</span>
                    <span className="file-date">{formatDate(file.uploadDate)}</span>
                  </div>
                  <div className="file-actions">
                    <button className="file-action-btn" onClick={() => handleDownloadFile(file)} title="Download">&#8595;</button>
                    <button className="file-action-btn file-delete-btn" onClick={() => handleDeleteFile(file.id)} title="Delete">&times;</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <label className="file-upload-btn">
          Upload Files
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </label>
      </BentoCard>
    </div>
  )
}
