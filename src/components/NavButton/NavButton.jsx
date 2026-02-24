import './NavButton.css'

export default function NavButton({ label, active, onClick }) {
  return (
    <button className={`nav-tab-btn ${active ? 'active' : ''}`} onClick={onClick}>
      <div className="nav-tab-btn-inner">
        {label}
        <div className="nav-tab-btn-shine" />
      </div>
    </button>
  )
}
