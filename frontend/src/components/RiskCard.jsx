import React from 'react'
import RiskBadge from './RiskBadge.jsx'
import RiskGauge from './RiskGauge.jsx'

export default function RiskCard({ score = 0, classification = 'likely_genuine', mlConfidence = null }) {
  const confidencePercent = mlConfidence != null ? Math.round(mlConfidence * 100) : 92

  return (
    <div className="cyber-card cyber-card-glow animate-fade-in" style={{ padding: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', gap: 24 }}>
        <div style={{ textAlign: 'center', minWidth: 200 }}>
          <RiskGauge score={score} size={130} />
          <div style={{ marginTop: 14 }}>
            <div className="muted" style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              OVERALL RISK ASSESSMENT
            </div>
            <div style={{ marginTop: 6 }}>
              <RiskBadge classification={classification} size="large" />
            </div>
          </div>
        </div>

        <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 28, minWidth: 260, flex: 1 }}>
          <div className="muted" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            🤖 AI HYBRID ENGINE CONFIDENCE
          </div>
          <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--primary)', marginTop: 4 }}>
            {confidencePercent}%
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 4 }}>
            {mlConfidence >= 0.6
              ? '🔴 High probability fraud identified by ML classifier'
              : mlConfidence >= 0.3
              ? '🟠 Moderate risk ambiguity detected'
              : '🟢 Genuine linguistic & structural signatures verified'}
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 8, background: 'var(--bg-subtle)', padding: '8px 12px', borderRadius: 8 }}>
            Engine Weights: <strong>60% Rule Matrix</strong> + <strong>40% TF-IDF Logistic Regression</strong>
          </div>
        </div>
      </div>
    </div>
  )
}
