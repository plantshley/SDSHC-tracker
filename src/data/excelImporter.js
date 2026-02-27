import * as XLSX from 'xlsx'
import db from './db'

/**
 * Parse the Cost-share History tab from the SDSHC Excel file
 * and import normalized records into IndexedDB.
 */
export async function importFromExcel(file) {
  const data = await file.arrayBuffer()
  const workbook = XLSX.read(data, { type: 'array' })

  const sheetName = workbook.SheetNames.find((n) => n.toLowerCase().includes('cost-share'))
  if (!sheetName) throw new Error('Could not find Cost-share History sheet')

  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })

  if (rows.length === 0) throw new Error('No data found in Cost-share History sheet')

  // Load contact info from Master Database (expanded) sheet
  const contactMap = new Map() // PersonID -> contact info
  const masterSheetName = workbook.SheetNames.find((n) =>
    n.toLowerCase().includes('master database') && n.toLowerCase().includes('expanded')
  ) || workbook.SheetNames.find((n) => n.toLowerCase().includes('master database'))

  // Also track relationships per PersonID to find Segment Contacts without cost-share
  const relationshipMap = new Map() // PersonID -> Set of relationship strings

  if (masterSheetName) {
    const masterSheet = workbook.Sheets[masterSheetName]
    const masterRows = XLSX.utils.sheet_to_json(masterSheet, { defval: '' })
    for (const mRow of masterRows) {
      const pid = String(mRow['PersonID'] || '').trim()
      if (!pid) continue

      const contact = {
        firstName: String(mRow['First Name'] || '').trim(),
        lastName: String(mRow['Last Name'] || '').trim(),
        email: String(mRow['Email'] || '').trim(),
        phone: String(mRow['Phone'] || '').trim(),
        address: String(mRow['Street'] || '').trim(),
        address2: String(mRow['Street II'] || '').trim(),
        city: String(mRow['City'] || '').trim(),
        state: String(mRow['State'] || '').trim(),
        zip: String(mRow['Zipcode'] || '').trim(),
        recordUrl: String(mRow['RecordURL'] || '').trim(),
      }

      // Keep the first (or most complete) contact entry per PersonID
      if (!contactMap.has(pid)) {
        contactMap.set(pid, contact)
      }

      // Collect all relationships for this person
      const rel = String(mRow['Relationship'] || '').trim()
      if (rel) {
        if (!relationshipMap.has(pid)) relationshipMap.set(pid, new Set())
        relationshipMap.get(pid).add(rel)
      }
    }
  }

  // Group rows by PersonID to deduplicate producers
  const producerMap = new Map()
  const contractMap = new Map()
  const bmpRows = []

  for (const row of rows) {
    const personID = String(row['PersonID'] || row['Person IDId'] || '').trim()
    const fullName = String(row['FullName'] || '').trim()
    if (!personID && !fullName) continue

    // Producer — use Master Database contact info if available
    if (!producerMap.has(personID)) {
      const contact = contactMap.get(personID) || {}
      const nameParts = fullName.split(' ')
      const firstName = contact.firstName || nameParts[0] || ''
      const lastName = contact.lastName || nameParts.slice(1).join(' ') || ''

      producerMap.set(personID, {
        personID,
        firstName,
        lastName,
        farmName: String(row['Farm Name'] || '').trim(),
        lifetimeCostshareTotal: parseFloat(row['LifetimeCostshareTotal']) || 0,
        lifetimeTotalAcres: parseFloat(row['Lifetime Total Acres']) || 0,
        email: contact.email || '',
        phone: contact.phone || '',
        address: contact.address || '',
        address2: contact.address2 || '',
        city: contact.city || '',
        state: contact.state || 'SD',
        zip: contact.zip || '',
        costShareUrl: String(row['CostShareURL'] || '').trim(),
      })
    }

    // Contract
    const contractId = String(row['Contract ID'] || '').trim()
    const contractKey = `${personID}_${contractId}`
    if (contractId && !contractMap.has(contractKey)) {
      contractMap.set(contractKey, {
        personID,
        contractNumber: contractId,
      })
    }

    // BMP row (one per row in the spreadsheet)
    bmpRows.push({
      personID,
      contractNumber: contractId,
      bmpType: String(row['BMP'] || '').trim(),
      bmpNumber: String(row['BMP Number'] || '').trim(),
      bmpCode: String(row['BMP ID'] || '').trim(),
      practiceAcres: parseFloat(row['Practice Acres']) || 0,
      practiceDate: parseExcelDate(row['Practice Date']),
      paidDate: parseExcelDate(row['Paid Date']),
      amount319: parseFloat(row['OData_319 Amount']) || 0,
      amountOther: parseFloat(row['Other Amount']) || 0,
      amountLocal: parseFloat(row['Local Amount']) || 0,
      amountTotal: parseFloat(row['Total Amount']) || 0,
      nReduction: parseFloat(row['N Reductions']) || 0,
      pReduction: parseFloat(row['P Reductions']) || 0,
      sReduction: parseFloat(row['S Reductions']) || 0,
      nCombined: parseFloat(row['N Combined']) || 0,
      pCombined: parseFloat(row['P Combined']) || 0,
      sCombined: parseFloat(row['S Combined']) || 0,
      lat: parseFloat(row['Lat']) || null,
      lng: parseFloat(row['Longitude']) || null,
      stream: String(row['Stream'] || '').trim(),
      projectYear: row['Project Year'] ? parseInt(row['Project Year']) : null,
      projectSegment: row['Project Segment'] ? parseInt(row['Project Segment']) : null,
    })
  }

  let segmentContactCount = 0

  // Clear existing data
  await db.transaction('rw',
    db.projects, db.producers, db.contracts, db.bmps, db.practices,
    db.bills, db.funds, db.npsReductions, db.npsReductionsCombined, db.imports,
    async () => {
      // Clear all existing data first
      await Promise.all([
        db.funds.clear(),
        db.bills.clear(),
        db.npsReductions.clear(),
        db.npsReductionsCombined.clear(),
        db.practices.clear(),
        db.bmps.clear(),
        db.contracts.clear(),
        db.producers.clear(),
        db.projects.clear(),
        db.imports.clear(),
      ])

      // Create project records for each unique segment
      const segments = new Set(bmpRows.map((r) => r.projectSegment).filter(Boolean))
      const projectIdMap = new Map()
      for (const seg of segments) {
        const projectId = await db.projects.add({
          name: `Soil Health Improvement and Planning Project Seg ${seg}`,
          segment: seg,
          year: null,
          sponsor: 'South Dakota Soil Health Coalition',
        })
        projectIdMap.set(seg, projectId)
      }
      // Default project for records without a segment
      if (!projectIdMap.has(null)) {
        const defaultProjId = await db.projects.add({
          name: 'Soil Health Improvement and Planning Project',
          segment: null,
          year: null,
          sponsor: 'South Dakota Soil Health Coalition',
        })
        projectIdMap.set(null, defaultProjId)
      }

      // Create producers
      const producerIdMap = new Map() // personID -> db id
      for (const [personID, pData] of producerMap) {
        // Assign to first segment found for this producer
        const firstRow = bmpRows.find((r) => r.personID === personID)
        const projectId = projectIdMap.get(firstRow?.projectSegment) || projectIdMap.get(null)

        const dbId = await db.producers.add({
          projectId,
          firstName: pData.firstName,
          lastName: pData.lastName,
          farmName: pData.farmName,
          personID: pData.personID,
          lifetimeCostshareTotal: pData.lifetimeCostshareTotal,
          lifetimeTotalAcres: pData.lifetimeTotalAcres,
          address: pData.address || '',
          address2: pData.address2 || '',
          city: pData.city || '',
          state: pData.state || 'SD',
          zip: pData.zip || '',
          phone: pData.phone || '',
          altPhone: '',
          email: pData.email || '',
          isImported: true,
          costShareUrl: pData.costShareUrl || '',
          importDate: new Date().toISOString(),
        })
        producerIdMap.set(personID, dbId)
      }

      // Create contracts
      const contractIdMap = new Map() // contractKey -> db id
      for (const [contractKey, cData] of contractMap) {
        const producerDbId = producerIdMap.get(cData.personID)
        if (!producerDbId) continue

        const dbId = await db.contracts.add({
          producerId: producerDbId,
          contractNumber: cData.contractNumber,
          startDate: null,
          endDate: null,
          legalDescription: '',
        })
        contractIdMap.set(contractKey, dbId)
      }

      // Create BMPs, practices, bills, funds, and NPS reductions
      for (const row of bmpRows) {
        const contractKey = `${row.personID}_${row.contractNumber}`
        const contractDbId = contractIdMap.get(contractKey)
        if (!contractDbId) continue

        // BMP
        const bmpId = await db.bmps.add({
          contractId: contractDbId,
          type: row.bmpType,
          bmpCode: row.bmpCode,
          completionDate: row.practiceDate,
          lat: row.lat,
          lng: row.lng,
          streamArea: row.stream,
          locationText: '',
        })

        // Practice
        const practiceId = await db.practices.add({
          bmpId,
          practiceType: row.bmpType,
          practiceCode: row.bmpNumber,
          status: 'Completed',
          startDate: null,
          completionDate: row.practiceDate,
          acres: row.practiceAcres,
          comments: '',
        })

        // Bill (if there's any payment)
        if (row.amountTotal > 0 || row.amount319 > 0 || row.amountOther > 0 || row.amountLocal > 0) {
          const billId = await db.bills.add({
            practiceId,
            description: row.bmpType,
            quantity: 1,
            units: '',
            paymentNumber: '',
            paidDate: row.paidDate,
            serviceBeginDate: null,
            serviceEndDate: null,
            notes: '',
          })

          // Funds
          if (row.amount319 > 0) {
            await db.funds.add({ billId, fundName: '319', amount: row.amount319, isAdvance: false })
          }
          if (row.amountOther > 0) {
            await db.funds.add({ billId, fundName: 'Other', amount: row.amountOther, isAdvance: false })
          }
          if (row.amountLocal > 0) {
            await db.funds.add({ billId, fundName: 'Local', amount: row.amountLocal, isAdvance: false })
          }
        }

        // NPS Reductions (per-practice)
        if (row.nReduction > 0) {
          await db.npsReductions.add({ practiceId, pollutant: 'N', quantity: row.nReduction, unit: 'lbs/year' })
        }
        if (row.pReduction > 0) {
          await db.npsReductions.add({ practiceId, pollutant: 'P', quantity: row.pReduction, unit: 'lbs/year' })
        }
        if (row.sReduction > 0) {
          await db.npsReductions.add({ practiceId, pollutant: 'S', quantity: row.sReduction, unit: 'lbs/year' })
        }

        // Combined NPS reductions (contract-level) — store once per contract
        // Only add if not already stored for this contract
        const existingCombined = await db.npsReductionsCombined
          .where('contractId').equals(contractDbId)
          .count()
        if (existingCombined === 0) {
          if (row.nCombined > 0) {
            await db.npsReductionsCombined.add({ contractId: contractDbId, pollutant: 'N', quantity: row.nCombined, unit: 'lbs/year' })
          }
          if (row.pCombined > 0) {
            await db.npsReductionsCombined.add({ contractId: contractDbId, pollutant: 'P', quantity: row.pCombined, unit: 'lbs/year' })
          }
          if (row.sCombined > 0) {
            await db.npsReductionsCombined.add({ contractId: contractDbId, pollutant: 'S', quantity: row.sCombined, unit: 'lbs/year' })
          }
        }
      }

      // Add Segment Contact-only people as producers
      // (people with "Segment 1 Contact" or "Segment 2 Contact" but no "Cost-share Recipient")
      for (const [pid, rels] of relationshipMap) {
        // Skip if already created as a cost-share producer
        if (producerIdMap.has(pid)) continue

        const hasSegContact = [...rels].some((r) =>
          r.toLowerCase().includes('segment') && r.toLowerCase().includes('contact')
        )
        const hasCostShare = [...rels].some((r) =>
          r.toLowerCase().includes('cost-share recipient')
        )
        if (!hasSegContact || hasCostShare) continue

        const contact = contactMap.get(pid)
        if (!contact) continue

        // Determine which segment(s) this person is a contact for
        const isSeg1 = [...rels].some((r) => r.toLowerCase().includes('segment 1'))
        const isSeg2 = [...rels].some((r) => r.toLowerCase().includes('segment 2'))
        const segment = isSeg1 ? 1 : isSeg2 ? 2 : null

        // Ensure project exists for this segment
        if (segment && !projectIdMap.has(segment)) {
          const projId = await db.projects.add({
            name: `Soil Health Improvement and Planning Project Seg ${segment}`,
            segment,
            year: null,
            sponsor: 'South Dakota Soil Health Coalition',
          })
          projectIdMap.set(segment, projId)
        }

        const projectId = projectIdMap.get(segment) || projectIdMap.get(null)

        await db.producers.add({
          projectId,
          firstName: contact.firstName,
          lastName: contact.lastName,
          farmName: '',
          personID: pid,
          lifetimeCostshareTotal: 0,
          lifetimeTotalAcres: 0,
          address: contact.address || '',
          address2: contact.address2 || '',
          city: contact.city || '',
          state: contact.state || 'SD',
          zip: contact.zip || '',
          phone: contact.phone || '',
          altPhone: '',
          email: contact.email || '',
          isImported: true,
          isSegmentContact: true,
          recordUrl: contact.recordUrl || '',
          importDate: new Date().toISOString(),
        })
        segmentContactCount++
      }

      // Record the import
      await db.imports.add({
        source: 'Excel (Cost-share History + Master Database)',
        importDate: new Date().toISOString(),
        recordCount: rows.length,
      })
    }
  )

  return {
    producersImported: producerMap.size,
    segmentContactsImported: segmentContactCount,
    contractsImported: contractMap.size,
    bmpsImported: bmpRows.length,
    totalRows: rows.length,
  }
}

function parseExcelDate(val) {
  if (!val) return null
  if (typeof val === 'number') {
    // Excel serial date
    const date = new Date((val - 25569) * 86400 * 1000)
    return date.toISOString().split('T')[0]
  }
  if (typeof val === 'string') {
    const parsed = new Date(val)
    if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0]
  }
  return null
}
