const LABELS = {
  likely_genuine: {
    en: 'SAFE / GENUINE',
    ta: 'உண்மையான வாய்ப்பு (பாதுகாப்பானது)',
    hi: 'सुरक्षित (वास्तविक)',
  },
  suspicious: {
    en: 'SUSPICIOUS',
    ta: 'சந்தேகத்திற்குரியது (எச்சரிக்கை)',
    hi: 'संदिग्ध (सावधानी)',
  },
  likely_fake: {
    en: 'HIGH RISK / SCAM',
    ta: 'அதிக ஆபத்து (போலி வாய்ப்பு)',
    hi: 'उच्च जोखिम (फर्जी अवसर)',
  },
}

const MAP = {
  likely_genuine: { cls: 'badge-green', emoji: '🛡️', labelKey: 'likely_genuine' },
  suspicious: { cls: 'badge-orange', emoji: '⚠️', labelKey: 'suspicious' },
  likely_fake: { cls: 'badge-red', emoji: '🚨', labelKey: 'likely_fake' },
}

export default function RiskBadge({ classification, size = 'normal' }) {
  const lang = localStorage.getItem('jobshield_lang') || 'en'
  const m = MAP[classification] || { cls: 'badge-gray', emoji: '⚪', labelKey: null }
  const text = m.labelKey ? (LABELS[m.labelKey][lang] || LABELS[m.labelKey]['en']) : 'UNKNOWN'

  const sizeClass = size === 'large' ? 'badge-pill-lg' : size === 'sm' ? 'badge-pill-sm' : ''

  return (
    <span className={`badge-pill ${m.cls} ${sizeClass}`}>
      <span>{m.emoji}</span>
      <span>{text}</span>
    </span>
  )
}

export function scoreColor(classification) {
  if (classification === 'likely_genuine') return 'var(--green)'
  if (classification === 'suspicious') return '#f97316'
  if (classification === 'likely_fake') return 'var(--red)'
  return 'var(--text-muted)'
}
