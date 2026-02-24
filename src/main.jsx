import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { DataProvider } from './context/DataContext'
import PasswordGate from './components/PasswordGate/PasswordGate'
import App from './App'
import HomePage from './pages/HomePage'
import ProducerListPage from './pages/ProducerListPage'
import ProducerDetailPage from './pages/ProducerDetailPage'
import ImportPage from './pages/ImportPage'
import ExportPage from './pages/ExportPage'
import PlaceholderPage from './pages/PlaceholderPage'
import './index.css'
import './App.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <PasswordGate>
        <DataProvider>
          <Routes>
            <Route element={<App />}>
              <Route index element={<HomePage />} />
              <Route path="producers" element={<ProducerListPage />} />
              <Route path="producers/:id" element={<ProducerDetailPage />} />
              <Route path="entry" element={<PlaceholderPage title="New Entry" description="Multi-step data entry wizard coming soon." />} />
              <Route path="entry/pdf" element={<PlaceholderPage title="PDF Upload" description="Upload a Technician Packet PDF to auto-fill entry forms." />} />
              <Route path="map" element={<PlaceholderPage title="Map" description="Interactive map showing all BMP locations coming soon." />} />
              <Route path="contracts/:id" element={<PlaceholderPage title="Contract Detail" description="Contract detail view coming soon." />} />
              <Route path="bmps/:id" element={<PlaceholderPage title="BMP Detail" description="BMP detail view coming soon." />} />
              <Route path="practices/:id" element={<PlaceholderPage title="Practice Detail" description="Practice detail view coming soon." />} />
              <Route path="vouchers" element={<PlaceholderPage title="Vouchers" description="Voucher management coming soon." />} />
              <Route path="vouchers/:id" element={<PlaceholderPage title="Voucher Detail" description="Voucher detail view coming soon." />} />
              <Route path="grts" element={<PlaceholderPage title="GRTS Reports" description="GRTS report generation coming soon." />} />
              <Route path="grts/:id" element={<PlaceholderPage title="GRTS Report" description="GRTS report editor coming soon." />} />
              <Route path="import" element={<ImportPage />} />
              <Route path="export" element={<ExportPage />} />
              <Route path="settings" element={<PlaceholderPage title="Settings" description="App settings and data management coming soon." />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </DataProvider>
      </PasswordGate>
    </HashRouter>
  </React.StrictMode>
)
