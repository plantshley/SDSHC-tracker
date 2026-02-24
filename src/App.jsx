import { useCallback } from 'react'
import { Outlet, Link } from 'react-router-dom'
import NavBar from './components/NavBar/NavBar'
import { AUTH_KEY } from './components/PasswordGate/PasswordGate'

export default function App() {
  const handleLogout = useCallback(() => {
    localStorage.removeItem(AUTH_KEY)
    localStorage.removeItem('sdshc-tracker-role')
    window.location.reload()
  }, [])

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="app-header-inner">
          <Link to="/" className="app-logo">SDSHC Tracker</Link>
          <NavBar />
          <button className="app-logout-btn" onClick={handleLogout} title="Log out">
            Log out
          </button>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
