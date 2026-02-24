import Dexie from 'dexie'

const db = new Dexie('SDSHCTracker')

db.version(1).stores({
  projects: '++id, name, segment, year',
  producers: '++id, projectId, firstName, lastName, farmName, personID, email',
  contracts: '++id, producerId, contractNumber, startDate, endDate',
  bmps: '++id, contractId, type, bmpCode, completionDate, lat, lng, streamArea',
  practices: '++id, bmpId, practiceType, practiceCode, status, startDate, completionDate, acres',
  bills: '++id, practiceId, description, paidDate',
  funds: '++id, billId, fundName, amount, isAdvance',
  photos: '++id, bmpId, date',
  milestones: '++id, bmpId, actualAmount, unit',
  npsReductions: '++id, practiceId, pollutant, quantity, unit',
  npsReductionsCombined: '++id, contractId, pollutant, quantity, unit',
  vouchers: '++id, projectId, name, voucherDate, status, finalizedDate',
  voucherItems: '++id, voucherId, billId, fundId',
  grtsReports: '++id, projectId, fiscalYear, reportingPeriod, status',
  imports: '++id, source, importDate, recordCount',
})

export default db
