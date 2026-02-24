import { useNavigate } from 'react-router-dom'
import './ProducerCard.css'

export default function ProducerCard({ producer }) {
  const navigate = useNavigate()

  return (
    <div
      className="producer-card"
      onClick={() => navigate(`/producers/${producer.id}`)}
    >
      <div className="producer-card-farm">{producer.farmName || 'No Farm Name'}</div>
      <div className="producer-card-name">
        {producer.firstName} {producer.lastName}
      </div>
      {producer.contractNumbers && producer.contractNumbers.length > 0 && (
        <div className="producer-card-contracts">
          {producer.contractNumbers.map((cn) => (
            <span key={cn} className="producer-card-tag">{cn}</span>
          ))}
        </div>
      )}
      {producer.segments && producer.segments.length > 0 && (
        <div className="producer-card-segments">
          {producer.segments.map((seg) => (
            <span key={seg} className="producer-card-seg">Seg {seg}</span>
          ))}
        </div>
      )}
      {producer.totalFunding != null && producer.totalFunding > 0 && (
        <div className="producer-card-funding">
          ${producer.totalFunding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      )}
    </div>
  )
}
