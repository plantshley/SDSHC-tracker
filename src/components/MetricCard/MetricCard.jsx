import './MetricCard.css'

export default function MetricCard({ label, value, subtitle }) {
  return (
    <div className="metric-card">
      <div className="metric-card-value">{value}</div>
      <div className="metric-card-label">{label}</div>
      {subtitle && <div className="metric-card-subtitle">{subtitle}</div>}
    </div>
  )
}
