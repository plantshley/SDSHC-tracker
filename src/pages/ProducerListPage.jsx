import { useState, useEffect, useMemo } from 'react'
import ProducerCard from '../components/ProducerCard/ProducerCard'
import db from '../data/db'
import './ProducerListPage.css'

export default function ProducerListPage() {
  const [producers, setProducers] = useState([])
  const [contracts, setContracts] = useState([])
  const [projects, setProjects] = useState([])
  const [search, setSearch] = useState('')
  const [segmentFilter, setSegmentFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [p, c, proj] = await Promise.all([
        db.producers.toArray(),
        db.contracts.toArray(),
        db.projects.toArray(),
      ])
      setProducers(p)
      setContracts(c)
      setProjects(proj)
      setLoading(false)
    }
    load()
  }, [])

  const enrichedProducers = useMemo(() => {
    return producers.map((p) => {
      const producerContracts = contracts.filter((c) => c.producerId === p.id)
      const contractNumbers = producerContracts.map((c) => c.contractNumber).filter(Boolean)
      const contractIds = producerContracts.map((c) => c.id)

      // Get segments from projects
      const projectIds = [...new Set([p.projectId])]
      const segments = projects
        .filter((proj) => projectIds.includes(proj.id))
        .map((proj) => proj.segment)
        .filter(Boolean)

      return {
        ...p,
        contractNumbers,
        segments: [...new Set(segments)],
        totalFunding: p.lifetimeCostshareTotal || 0,
      }
    })
  }, [producers, contracts, projects])

  const filtered = useMemo(() => {
    let result = enrichedProducers

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((p) =>
        (p.firstName && p.firstName.toLowerCase().includes(q)) ||
        (p.lastName && p.lastName.toLowerCase().includes(q)) ||
        (p.farmName && p.farmName.toLowerCase().includes(q)) ||
        (p.contractNumbers && p.contractNumbers.some((cn) => cn.toLowerCase().includes(q)))
      )
    }

    if (segmentFilter !== 'all') {
      result = result.filter((p) =>
        p.segments.includes(Number(segmentFilter))
      )
    }

    return result.sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''))
  }, [enrichedProducers, search, segmentFilter])

  // Get available segments for filter
  const availableSegments = useMemo(() => {
    const segs = new Set()
    enrichedProducers.forEach((p) => p.segments.forEach((s) => segs.add(s)))
    return [...segs].sort()
  }, [enrichedProducers])

  if (loading) {
    return (
      <div className="app-loading">
        <div className="app-loading-spinner" />
        <span>Loading producers...</span>
      </div>
    )
  }

  return (
    <div className="producer-list-page">
      <div className="producer-list-header">
        <h2 className="producer-list-title">Producers</h2>
        <span className="producer-list-count">{filtered.length} producer{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="producer-list-controls">
        <input
          type="text"
          className="producer-list-search"
          placeholder="Search by name, farm, or contract..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="producer-list-segment-toggle">
          <button
            className={`segment-btn ${segmentFilter === 'all' ? 'active' : ''}`}
            onClick={() => setSegmentFilter('all')}
          >
            All
          </button>
          {availableSegments.map((seg) => (
            <button
              key={seg}
              className={`segment-btn ${segmentFilter === String(seg) ? 'active' : ''}`}
              onClick={() => setSegmentFilter(String(seg))}
            >
              Seg {seg}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="producer-list-empty">
          <p>No producers found.</p>
          {producers.length === 0 && (
            <p style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
              Import historical data or create a new entry to get started.
            </p>
          )}
        </div>
      ) : (
        <div className="producer-card-grid">
          {filtered.map((p) => (
            <ProducerCard key={p.id} producer={p} />
          ))}
        </div>
      )}
    </div>
  )
}
