import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import BentoCard from '../components/BentoCard/BentoCard'
import { formatCurrencyFull, formatDate } from '../utils/formatters'
import db from '../data/db'
import './ProducerDetailPage.css'

export default function ProducerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [producer, setProducer] = useState(null)
  const [contracts, setContracts] = useState([])
  const [bmps, setBmps] = useState([])
  const [practices, setPractices] = useState([])
  const [bills, setBills] = useState([])
  const [funds, setFunds] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const p = await db.producers.get(Number(id))
      if (!p) { setLoading(false); return }
      setProducer(p)

      const c = await db.contracts.where('producerId').equals(p.id).toArray()
      setContracts(c)

      const contractIds = c.map((x) => x.id)
      const b = await db.bmps.where('contractId').anyOf(contractIds).toArray()
      setBmps(b)

      const bmpIds = b.map((x) => x.id)
      const pr = await db.practices.where('bmpId').anyOf(bmpIds).toArray()
      setPractices(pr)

      const practiceIds = pr.map((x) => x.id)
      const bi = await db.bills.where('practiceId').anyOf(practiceIds).toArray()
      setBills(bi)

      const billIds = bi.map((x) => x.id)
      const fu = await db.funds.where('billId').anyOf(billIds).toArray()
      setFunds(fu)

      setLoading(false)
    }
    load()
  }, [id])

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
          <h2 className="producer-detail-farm">{producer.farmName || 'No Farm Name'}</h2>
          <p className="producer-detail-name">{producer.firstName} {producer.lastName}</p>
        </div>
        <div className="producer-detail-stats">
          <div className="producer-stat">
            <span className="producer-stat-value">{formatCurrencyFull(producer.lifetimeCostshareTotal || totalFunding)}</span>
            <span className="producer-stat-label">Total Funding</span>
          </div>
          <div className="producer-stat">
            <span className="producer-stat-value">{producer.lifetimeTotalAcres || totalAcres}</span>
            <span className="producer-stat-label">Total Acres</span>
          </div>
        </div>
      </div>

      <BentoCard title="Contact Information">
        <div className="producer-info-grid">
          <div className="info-field">
            <label>Address</label>
            <span>{producer.address || '—'}</span>
          </div>
          <div className="info-field">
            <label>City, State, Zip</label>
            <span>{[producer.city, producer.state, producer.zip].filter(Boolean).join(', ') || '—'}</span>
          </div>
          <div className="info-field">
            <label>Phone</label>
            <span>{producer.phone || '—'}</span>
          </div>
          <div className="info-field">
            <label>Email</label>
            <span>{producer.email || '—'}</span>
          </div>
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

          return (
            <BentoCard key={contract.id} title={`Contract ${contract.contractNumber || contract.id}`}>
              <div className="contract-meta">
                <span>Start: {formatDate(contract.startDate)}</span>
                <span>End: {formatDate(contract.endDate)}</span>
                <span>Total: {formatCurrencyFull(contractTotal)}</span>
              </div>

              {contractBmps.length > 0 && (
                <div className="contract-bmps">
                  <h4 className="subsection-heading">BMPs ({contractBmps.length})</h4>
                  {contractBmps.map((bmp) => {
                    const bmpPractices = practices.filter((p) => p.bmpId === bmp.id)
                    return (
                      <div key={bmp.id} className="bmp-item">
                        <div className="bmp-item-header">
                          <span className="bmp-type">{bmp.type || bmp.bmpCode || 'Unknown BMP'}</span>
                          {bmp.completionDate && (
                            <span className="bmp-date">Completed: {formatDate(bmp.completionDate)}</span>
                          )}
                        </div>
                        {bmpPractices.length > 0 && (
                          <div className="bmp-practices">
                            {bmpPractices.map((pr) => (
                              <div key={pr.id} className="practice-row">
                                <span className="practice-type">{pr.practiceType || pr.practiceCode || 'Practice'}</span>
                                <span className="practice-acres">{pr.acres ? `${pr.acres} ac` : ''}</span>
                                <span className="practice-status">{pr.status || ''}</span>
                              </div>
                            ))}
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
    </div>
  )
}
