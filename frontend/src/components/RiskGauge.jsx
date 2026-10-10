import React from 'react'

export default function RiskGauge({ score = 0, size = 120 }) {
  const radius = (size / 2) - 10
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference

  const getGaugeColor = (s) => {
    if (s <= 30) return 'var(--green)'
    if (s <= 65) return '#f97316'
    return 'var(--red)'
  }

  const strokeColor = getGaugeColor(score)

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--bg-subtle)"
          strokeWidth="10"
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth="10"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <span style={{ fontSize: size * 0.26, fontWeight: 900, color: strokeColor, lineHeight: 1 }}>
          {score}
        </span>
        <span style={{ fontSize: size * 0.11, color: 'var(--text-muted)', fontWeight: 600, marginTop: 2 }}>
          / 100
        </span>
      </div>
    </div>
  )
}
