import BentoCard from '../components/BentoCard/BentoCard'

export default function PlaceholderPage({ title, description }) {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <BentoCard title={title}>
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: 13 }}>
          {description || 'This page is under construction.'}
        </p>
      </BentoCard>
    </div>
  )
}
