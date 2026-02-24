# SDSHC Tracker — Rebuild Plan

## Context

The South Dakota Soil Health Coalition (SDSHC) uses an old ASP.NET web app ("Tracker") hosted at apps.sd.gov to manage cost-share conservation projects under EPA Section 319. Technicians enter data about farmers (producers) who implement BMPs (Best Management Practices) — cover crops, grazing management, no-till, etc. — and the Coalition reimburses them from multiple funding sources (319, CWSRF-WQ, local, private).

**Problems with the current system:** Tree-based navigation circa 2003, slow page loads, deeply nested forms, many unused sections (Livestock, MBE/WBE, GRTS report generation), and poor UX for technicians doing field data entry.

**Goal:** Build a modern, visually appealing replacement that matches the SDSHC master dashboard's styling, supports manual data entry + PDF auto-fill from Technician Packets, integrates the existing Excel historical database (438 cost-share records), and deploys free on GitHub Pages.

---

## Critical Architectural Decisions

### 1. Data Storage: IndexedDB via Dexie.js (not Excel-as-database)

The Excel file is an **import source** for historical data, not a live data store. The app will use:

- **IndexedDB** (via Dexie.js) for persistent structured storage in the browser — no server needed, supports complex queries, effectively unlimited size
- **JSON export/import** as the backup/sharing mechanism between users
- **Excel export** for reporting to DANR and other stakeholders

**Multi-user workflow (3-5 technicians):** Each user has their own browser database. One designated admin holds the canonical JSON backup. Technicians export their new entries, admin merges them. This is adequate for the current scale but the data layer will be abstracted so a real backend (Supabase/Firebase) can be swapped in later if needed.

### 2. Authentication: Client-Side Password Gate

Matching the master dashboard's existing pattern — a simple password screen with role selection (Admin vs. Technician). Not real security, but keeps casual visitors out. Swappable for OAuth later.

### 3. PDF Parsing: Client-Side with pdfjs-dist

The Technician Packet is a 12-page fillable PDF with a predictable structure. Client-side text extraction via pdf.js, with positional field mapping. Always optional — manual entry is the primary path.

### 4. Hosting: GitHub Pages (static, free)

Same deployment model as the master dashboard. Vite build, `gh-pages` package, HashRouter.

---

## Tech Stack

| Concern | Library | Rationale |
|---------|---------|-----------|
| Framework | React 19 + Vite 6 | Match master dashboard |
| Routing | react-router-dom 7 (HashRouter) | GitHub Pages compatible |
| Local DB | Dexie.js 4 | Clean IndexedDB wrapper |
| Excel I/O | xlsx (SheetJS) 0.18 | Match master dashboard |
| PDF parsing | pdfjs-dist 4 | Client-side text extraction |
| Maps | react-leaflet + Leaflet | Free, open-source, good for PLSS/lat-long |
| Charts | Recharts 2 | Match master dashboard |
| Image export | html2canvas 1.4 | Match master dashboard |
| CSS | Custom CSS variables | Match master dashboard (no component library) |
| Fonts | JetBrains Mono, Silkscreen, MuseoModerno | Match master dashboard |

---

## Data Model

### Database Schema (Dexie/IndexedDB)

```
projects:     ++id, name, segment, year, sponsor, startDate, endDate
producers:    ++id, projectId, firstName, lastName, farmName, personID,
              address, city, state, zip, phone, altPhone, email
contracts:    ++id, producerId, contractNumber, startDate, endDate,
              legalDescription (T/R/S)
bmps:         ++id, contractId, type, bmpCode, completionDate,
              lat, lng, streamArea, locationText
practices:    ++id, bmpId, practiceType, practiceCode, status,
              startDate, completionDate, acres, comments
bills:        ++id, practiceId, description, quantity, units,
              paymentNumber, paidDate, serviceBeginDate, serviceEndDate, notes
funds:        ++id, billId, fundName, amount, isAdvance
photos:       ++id, bmpId, type (before/after), dataUrl, caption, timestamp
milestones:   ++id, bmpId, dueDate, actualAmount, unit
npsReductions: ++id, bmpId, pollutant, cellQuantity, watershedQuantity, unit
imports:      ++id, source, importDate, recordCount
```

### Entity Hierarchy
```
Project
 └─ Producer (farmer)
     └─ Contract
         └─ BMP (e.g., "Cover Crops Cropland BMPs")
             ├─ Practice (e.g., "Cover Crop - 340")
             │   └─ Practice Bill (e.g., "Seed purchase")
             │       └─ Funds Used (e.g., "$2,000 from 319")
             ├─ Photos (before/after, up to 6)
             ├─ Milestones (acres completed by due date)
             └─ NPS Reductions (N, P, Sediment reductions)
```

---

## Technician Packet PDF → Field Mapping

The 12-page Technician Packet has this structure:

| Pages | Section | Extractable Fields |
|-------|---------|-------------------|
| 1-2 | Project Checklist & Notes | Name, Address, City/State/Zip, Phone, Email |
| 3-4 | Contract | Legal description (T/R/S), Contract term (years, start/end dates), Client info (repeated) |
| 5-10 | Conservation Plan | Farm/Tract, Applied Practices (checkboxes: cover crop, grazing mgmt, no-till, etc.), Per-practice tables: Tract, Field, Planned Acres, Month, Year, Applied Acres, Date |
| 11-12 | Cost-Share Worksheet | Practice, Amount, Unit, Unit Cost, Practice Totals, Final receipt amounts by funding source (DANR, USFWS, SDGFP, DU, USDA, Other) |

PDF upload flow: Upload → Extract text → Map to form fields → User reviews pre-filled form → Confirm & save.

---

## Excel Historical Import Mapping

The Cost-share History tab (438 rows, 35 columns) maps to the schema as follows:

| Excel Column | → Entity.Field |
|---|---|
| FullName | → producer.firstName + producer.lastName (split) |
| Farm Name | → producer.farmName |
| PersonID | → producer.personID |
| Contract ID | → contract.contractNumber |
| Project Year | → project.year |
| Project Segment | → project.segment |
| BMP | → bmp.type |
| BMP Number | → bmp.practiceCode |
| BMP ID | → bmp.bmpCode |
| Lat, Longitude | → bmp.lat, bmp.lng |
| Stream | → bmp.streamArea |
| Practice Acres | → practice.acres |
| Practice Date | → practice.completionDate |
| Paid Date | → bill.paidDate |
| OData_319 Amount | → funds (fundName: "319") |
| Other Amount | → funds (fundName: "Other") |
| Local Amount | → funds (fundName: "Local") |
| Total Amount | → bill total (computed) |
| N/P/S Reductions | → npsReductions (per-BMP) |
| N/P/S Combined | → npsReductions (cumulative) |
| LifetimeCostshareTotal | → producer computed metric |
| Lifetime Total Acres | → producer computed metric |

Deduplication: Group rows by PersonID to create one producer record, then split contracts/BMPs by Contract ID.

---

## Application Pages & Routes

```
/                    → Dashboard (KPIs, charts, recent activity)
/producers           → Producer list (searchable DataTable)
/producers/:id       → Producer detail (info + contracts list)
/contracts/:id       → Contract detail (info + BMPs list)
/bmps/:id            → BMP detail (info + practices + photos + map pin)
/practices/:id       → Practice detail (info + bills + funds)
/entry               → New entry wizard (multi-step form)
/entry/pdf           → PDF upload & auto-fill flow
/map                 → Full-page map of all BMP locations
/vouchers            → Voucher list (draft + finalized)
/vouchers/:id        → Voucher detail (add bills, summary, finalize)
/grts                → GRTS report list
/grts/:id            → GRTS report editor (auto-populated + narrative)
/import              → Import from Excel/JSON
/export              → Export to Excel/JSON/Print
/settings            → App settings, data management
```

### Navigation
Top nav bar (matching master dashboard style) with tabs: **Dashboard | Producers | New Entry | Map | Reports | Data**

- "Reports" tab opens a dropdown for: Vouchers, GRTS Reports, Project Summary
- "Data" tab opens a dropdown for: Import, Export, Settings

---

## UI Components

### Copied from Master Dashboard (adapt as needed)
- `BentoGrid` / `BentoCard` — layout system
- `DataTable` — sortable, searchable table (extend with inline editing)
- `MetricCard` — KPI display cards
- `FilterBar` — multi-select dropdown filters
- `ExportDropdown` — PNG/Excel export menu
- `NavBar` / `NavButton` — top navigation
- `PasswordGate` — auth screen (add role selector)
- `ThemeToggle` — dark/light mode
- `App.css` — full CSS variable system with theme colors
- `index.css` — reset styles and fonts
- `formatters.js`, `exportUtils.js` — utilities

### New Components to Build
- `FormField` — reusable labeled input with validation
- `FormSection` — collapsible form section
- `Breadcrumb` — hierarchy navigation (Project > Producer > Contract > BMP)
- `StatusBadge` — color-coded status indicator
- `PhotoUpload` — drag-drop with client-side image compression
- `PhotoGallery` — grid of before/after photos with lightbox
- `MapPicker` — Leaflet map for clicking to set lat/long
- `PDFUploader` — upload + parse + review flow
- `ConfirmDialog` — modal for destructive actions
- `EntryWizard` — multi-step form with progress indicator

### Theme
Accent color: **teal (#4CA5C2)** — matching the cost-share dashboard since this is the same data domain.

---

## Dashboard Home Page

KPI cards (MetricCard):
- Total Producers
- Total Active Contracts
- Total Funding Distributed (all sources)
- Total Practice Acres
- Total N/P/S Reductions

Charts (BentoGrid with BentoCards):
- Funding by year (stacked bar: 319 vs. CWSRF vs. Local vs. Other)
- BMP type distribution (pie/donut chart)
- Acres by year (area chart)
- Nutrient reductions summary (grouped bar: N, P, S)
- Recent activity feed (last 10 modified records)
- Mini map preview of all BMP locations

---

## Sections from Current System — Keep vs. Remove

| Section | Decision | Rationale |
|---------|----------|-----------|
| Producer info | **Keep** | Core data |
| Contracts | **Keep** | Core data |
| BMPs | **Keep** | Core data |
| Practices + Bills + Funds | **Keep** | Core financial tracking |
| Photos | **Keep** | Before/after documentation |
| Map/Location | **Keep** | BMP location tracking |
| Milestones | **Keep** (simplified) | Tracks acres completed; needed for reporting |
| NPS Reductions | **Keep** (simplified) | N/P/S reduction tracking; needed for reporting |
| Voucher system | **Keep** (simplified) | Group bills by fund, generate summary printout, finalize/lock |
| GRTS report generation | **Keep** (simplified) | Auto-populate milestones/reductions from data, export to Word/print |
| Personnel Salaries | **Remove** | Not technician-facing; done in separate system |
| Non-Salary Expenses | **Remove** | Not technician-facing; done in separate system |
| Livestock Management | **Remove** | Never used by SDSHC |
| MBE/WBE tracking | **Remove** | Never used by SDSHC |
| Assessment Goals | **Remove** | Not applicable to SDSHC projects |

---

## Simplified Voucher System

The current Tracker's voucher system lets coordinators group expense bills into a voucher, associate funding sources, preview a summary, and finalize (lock) it for submission to DANR. The simplified version will:

- **Create voucher:** Name/date, select fund(s) to include
- **Add bills:** Pick from un-vouchered practice bills (checklist UI)
- **Summary view:** Auto-generated table showing reimbursable amounts, match amounts, and advance repayment — grouped by fund source and BMP/Non-salary/Salary category
- **Finalize:** Lock the voucher (no further edits). Stores finalization date.
- **Print/Export:** Browser print-to-PDF of the voucher summary, or Excel export

Not included (can be added later): Email notification to project officer, unfinalize flow (admin can delete and recreate instead).

### Voucher Data Model Addition
```
vouchers:     ++id, projectId, name, voucherDate, status (draft/finalized),
              finalizedDate, fundNames[]
voucherItems: ++id, voucherId, billId, fundId
```

## Simplified GRTS Report

The current system auto-populates milestone completions, NPS reductions, and wetland/streambank data from the project's BMP data, then lets the coordinator add narrative text. The simplified version will:

- **Auto-populate:** Pull milestones completed, NPS reductions, and GRTS-required fields (wetlands, streambank) from BMP/practice data within a user-specified date range
- **Narrative fields:** Text areas for Overall Accomplishments, Objective/Task Accomplishments, Conclusions
- **Status fields:** Reporting period (MidYear/Annual), Status dropdown, Amendment checkbox
- **Export:** Print-view page formatted like the current GRTS report (Figure 35-37 in user manual), exportable via browser print-to-PDF or copy-paste to Word

Not included: Direct Word doc generation (user prints to PDF or copies from the print view).

### GRTS Data Model Addition
```
grtsReports:  ++id, projectId, fiscalYear, reportDateFrom, reportDateTo,
              reportingPeriod, status, hasAmendment,
              overallAccomplishments, objectiveAccomplishments, conclusions,
              savedDate, finalizedDate
```

---

## Implementation Phases

### Phase 1: Foundation & Historical Data (Weeks 1-2)
- Project scaffolding (Vite + React + routing + CSS from master dashboard)
- Dexie database schema and CRUD hooks (including voucher + GRTS tables)
- Copy and adapt shared components from master dashboard
- Excel historical import (parse 438 rows → normalized entities)
- ProducerListPage with searchable DataTable
- ProducerDetailPage with contract list
- PasswordGate with role selection
- JSON export/import for backup

### Phase 2: Full Data Entry (Weeks 3-4)
- ContractDetailPage, BMPDetailPage, PracticeDetailPage
- Form components (FormField, FormSection, Breadcrumb)
- Multi-step data entry wizard (New Entry flow)
- Bill and funds entry with running totals and fund availability display
- Milestone entry (simplified)
- NPS reduction entry

### Phase 3: Visual Features (Weeks 5-6)
- Dashboard homepage with MetricCards and Recharts charts
- MapOverviewPage (all BMP locations on Leaflet map)
- MapPicker component (click to set lat/long, T/R/S search)
- PhotoUpload with client-side compression
- PhotoGallery with lightbox view
- Dark mode verification

### Phase 4: Voucher, GRTS, PDF Parsing & Export (Weeks 7-8)
- Simplified voucher system (create, add bills, summary, finalize, print)
- Simplified GRTS report (auto-populate from data, narrative fields, print view)
- Technician Packet PDF parser (pdfjs-dist)
- PDF upload → review → save flow
- Excel export (multi-sheet workbook)
- Print-view pages for contracts/BMPs/vouchers/GRTS (browser print-to-PDF)
- Cost-share worksheet generator

### Phase 5: Polish & Deploy (Week 9)
- GitHub Pages deployment (gh-pages + GitHub Actions)
- Responsive design for tablet use in the field
- Empty states, validation messages, error handling
- Browser compatibility testing
- In-app help tooltips on complex fields

---

## Verification Plan

1. **Historical import:** Import the Excel file → verify all 438 rows create correct producer/contract/BMP/practice/fund records → spot-check 5 records against original Excel data
2. **CRUD:** Create a new producer → add contract → add BMP → add practice → add bill → add funds → verify all saved correctly in IndexedDB → verify shows up in DataTable
3. **PDF upload:** Upload a Technician Packet → verify extracted fields match PDF content → confirm/save → verify records created
4. **Export:** Export to JSON → clear IndexedDB → re-import JSON → verify all data intact. Export to Excel → open in Excel → verify formatting and data.
5. **Map:** Verify BMP locations display correctly on map → test MapPicker lat/long selection → test T/R/S search
6. **Dashboard:** Verify KPI metrics match underlying data → verify charts render correctly with filters
7. **Cross-browser:** Test in Chrome, Edge, Firefox on desktop and tablet
8. **Dark mode:** Toggle theme → verify all pages render correctly in both modes

---

## Resolved Decisions

- **Data sharing:** JSON export/import (no backend needed)
- **Theme color:** Teal (#4CA5C2)
- **Voucher + GRTS:** Simplified versions included from Phase 4
