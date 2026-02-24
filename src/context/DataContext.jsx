import { createContext, useContext, useState, useEffect } from 'react'
import db from '../data/db'

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState({
    producers: 0,
    contracts: 0,
    bmps: 0,
    practices: 0,
  })

  useEffect(() => {
    async function loadCounts() {
      try {
        const [producers, contracts, bmps, practices] = await Promise.all([
          db.producers.count(),
          db.contracts.count(),
          db.bmps.count(),
          db.practices.count(),
        ])
        setCounts({ producers, contracts, bmps, practices })
      } catch (err) {
        console.error('Failed to load counts:', err)
      } finally {
        setLoading(false)
      }
    }
    loadCounts()
  }, [])

  const refreshCounts = async () => {
    const [producers, contracts, bmps, practices] = await Promise.all([
      db.producers.count(),
      db.contracts.count(),
      db.bmps.count(),
      db.practices.count(),
    ])
    setCounts({ producers, contracts, bmps, practices })
  }

  return (
    <DataContext.Provider value={{ db, loading, counts, refreshCounts }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
