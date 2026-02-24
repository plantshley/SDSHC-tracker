import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import NavButton from '../NavButton/NavButton'
import ThemeToggle from '../ThemeToggle/ThemeToggle'
import './NavBar.css'

const tabs = [
  { label: 'Dashboard', path: '/' },
  { label: 'Producers', path: '/producers' },
  { label: 'New Entry', path: '/entry' },
  { label: 'Map', path: '/map' },
]

const reportItems = [
  { label: 'Vouchers', path: '/vouchers' },
  { label: 'GRTS Reports', path: '/grts' },
]

const dataItems = [
  { label: 'Import', path: '/import' },
  { label: 'Export', path: '/export' },
  { label: 'Settings', path: '/settings' },
]

function DropdownNav({ label, items, currentPath }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()
  const isActive = items.some((item) => currentPath.startsWith(item.path))

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="nav-dropdown-wrapper" ref={ref}>
      <NavButton
        label={label}
        active={isActive}
        onClick={() => setOpen(!open)}
      />
      {open && (
        <div className="nav-dropdown-menu">
          {items.map((item) => (
            <button
              key={item.path}
              className={`nav-dropdown-item ${currentPath === item.path ? 'active' : ''}`}
              onClick={() => {
                navigate(item.path)
                setOpen(false)
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function NavBar() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <nav className="nav-bar">
      <div className="nav-tabs">
        {tabs.map((tab) => (
          <NavButton
            key={tab.path}
            label={tab.label}
            active={location.pathname === tab.path}
            onClick={() => navigate(tab.path)}
          />
        ))}
        <DropdownNav label="Reports" items={reportItems} currentPath={location.pathname} />
        <DropdownNav label="Data" items={dataItems} currentPath={location.pathname} />
      </div>
      <ThemeToggle />
    </nav>
  )
}
