import { useState, useEffect } from 'react'
import './PasswordGate.css'

export const AUTH_KEY = 'sdshc-tracker-auth'
const PASSWORD = 'WeHeartS0il!'

export default function PasswordGate({ children }) {
  const [authenticated, setAuthenticated] = useState(
    () => localStorage.getItem(AUTH_KEY) === 'true'
  )
  const [input, setInput] = useState('')
  const [role, setRole] = useState(() => localStorage.getItem('sdshc-tracker-role') || 'technician')
  const [error, setError] = useState(false)

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(false), 600)
      return () => clearTimeout(timer)
    }
  }, [error])

  if (authenticated) return children

  const handleSubmit = (e) => {
    e.preventDefault()
    if (input === PASSWORD) {
      localStorage.setItem(AUTH_KEY, 'true')
      localStorage.setItem('sdshc-tracker-role', role)
      setAuthenticated(true)
    } else {
      setError(true)
      setInput('')
    }
  }

  return (
    <div className="gate-backdrop">
      <div className={`gate-card${error ? ' gate-shake' : ''}`}>
        <h1 className="gate-title">SDSHC Tracker</h1>
        <p className="gate-subtitle">Enter password to continue</p>

        <form onSubmit={handleSubmit} className="gate-form">
          <input
            type="text"
            name="username"
            autoComplete="username"
            value="sdshc"
            readOnly
            className="gate-hidden-input"
            tabIndex={-1}
            aria-hidden="true"
          />
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Password"
            className="gate-input"
            autoFocus
          />
          <div className="gate-role-group">
            <label className="gate-role-label">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="gate-role-select"
            >
              <option value="technician">Technician</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button type="submit" className="gate-submit">
            Enter
          </button>
        </form>

        {error && (
          <p className="gate-error">Incorrect password</p>
        )}
      </div>
    </div>
  )
}
