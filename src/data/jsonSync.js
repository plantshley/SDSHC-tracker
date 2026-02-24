import db from './db'

const TABLE_NAMES = [
  'projects', 'producers', 'contracts', 'bmps', 'practices',
  'bills', 'funds', 'photos', 'milestones', 'npsReductions',
  'npsReductionsCombined', 'vouchers', 'voucherItems', 'grtsReports', 'imports',
]

/**
 * Export the entire database as a JSON object.
 */
export async function exportToJSON() {
  const data = {}
  for (const tableName of TABLE_NAMES) {
    data[tableName] = await db[tableName].toArray()
  }
  data._exportDate = new Date().toISOString()
  data._version = 1
  return data
}

/**
 * Download the database as a JSON file.
 */
export async function downloadJSON(filename = 'sdshc-tracker-backup') {
  const data = await exportToJSON()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`
  link.href = url
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Import data from a JSON file, replacing all current data.
 */
export async function importFromJSON(file) {
  const text = await file.text()
  const data = JSON.parse(text)

  if (!data._version) {
    throw new Error('Invalid backup file: missing version info')
  }

  await db.transaction('rw', ...TABLE_NAMES.map((t) => db[t]), async () => {
    // Clear all tables
    for (const tableName of TABLE_NAMES) {
      await db[tableName].clear()
    }

    // Import all records
    for (const tableName of TABLE_NAMES) {
      if (data[tableName] && Array.isArray(data[tableName])) {
        await db[tableName].bulkAdd(data[tableName])
      }
    }
  })

  return {
    tablesImported: TABLE_NAMES.filter((t) => data[t] && data[t].length > 0).length,
    totalRecords: TABLE_NAMES.reduce((sum, t) => sum + (data[t]?.length || 0), 0),
  }
}
