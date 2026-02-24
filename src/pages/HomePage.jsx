import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import BentoGrid from '../components/BentoGrid/BentoGrid'
import BentoCard from '../components/BentoCard/BentoCard'
import MetricCard from '../components/MetricCard/MetricCard'
import { formatCurrency, formatNumber } from '../utils/formatters'
import db from '../data/db'

export default function HomePage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    async function loadStats() {
      const [producerCount, contractCount, bmpCount, practiceCount] = await Promise.all([
        db.producers.count(),
        db.contracts.count(),
        db.bmps.count(),
        db.practices.count(),
      ])

      const allFunds = await db.funds.toArray()
      const totalFunding = allFunds.reduce((sum, f) => sum + (f.amount || 0), 0)

      const allPractices = await db.practices.toArray()
      const totalAcres = allPractices.reduce((sum, p) => sum + (p.acres || 0), 0)

      const allReductions = await db.npsReductions.toArray()
      const nReductions = allReductions.filter(r => r.pollutant === 'N').reduce((s, r) => s + (r.quantity || 0), 0)
      const pReductions = allReductions.filter(r => r.pollutant === 'P').reduce((s, r) => s + (r.quantity || 0), 0)
      const sReductions = allReductions.filter(r => r.pollutant === 'S').reduce((s, r) => s + (r.quantity || 0), 0)

      setStats({
        producerCount, contractCount, bmpCount, practiceCount,
        totalFunding, totalAcres,
        nReductions, pReductions, sReductions,
      })
    }
    loadStats()
  }, [])

  if (!stats) {
    return (
      <div className="app-loading">
        <div className="app-loading-spinner" />
        <span>Loading dashboard...</span>
      </div>
    )
  }

  return (
    <div>
      <BentoGrid>
        <MetricCard label="Producers" value={formatNumber(stats.producerCount)} />
        <MetricCard label="Active Contracts" value={formatNumber(stats.contractCount)} />
        <MetricCard label="Total Funding" value={formatCurrency(stats.totalFunding)} />
        <MetricCard label="Practice Acres" value={formatNumber(stats.totalAcres)} />
      </BentoGrid>

      <div style={{ marginTop: 16 }}>
        <BentoGrid>
          <BentoCard title="N Reductions" colSpan={1}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)' }}>
                {formatNumber(stats.nReductions)}
              </span>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>lbs/year</div>
            </div>
          </BentoCard>
          <BentoCard title="P Reductions" colSpan={1}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)' }}>
                {formatNumber(stats.pReductions)}
              </span>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>lbs/year</div>
            </div>
          </BentoCard>
          <BentoCard title="S Reductions" colSpan={1}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)' }}>
                {formatNumber(stats.sReductions)}
              </span>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>lbs/year</div>
            </div>
          </BentoCard>
          <BentoCard title="BMPs" colSpan={1}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)' }}>
                {formatNumber(stats.bmpCount)}
              </span>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>implemented</div>
            </div>
          </BentoCard>
        </BentoGrid>
      </div>

      {stats.producerCount === 0 && (
        <BentoCard title="Get Started" colSpan={4} className="" style={{ marginTop: 16 }}>
          <div style={{ padding: '20px 0', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 16, fontFamily: 'var(--font-heading)', fontSize: 14 }}>
              No data yet. Import historical data or start entering new records.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/import')}
                style={{
                  padding: '10px 24px', background: 'var(--accent)', color: 'white',
                  border: 'none', borderRadius: 10, fontFamily: 'var(--font-heading)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer'
                }}
              >
                Import Data
              </button>
              <button
                onClick={() => navigate('/entry')}
                style={{
                  padding: '10px 24px', background: 'transparent', color: 'var(--accent)',
                  border: '1px solid var(--accent)', borderRadius: 10, fontFamily: 'var(--font-heading)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer'
                }}
              >
                New Entry
              </button>
            </div>
          </div>
        </BentoCard>
      )}
    </div>
  )
}
