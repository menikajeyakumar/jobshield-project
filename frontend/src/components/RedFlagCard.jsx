import React from 'react'

export default function RedFlagCard({ redFlags = [], positiveIndicators = [] }) {
  if (!redFlags.length && !positiveIndicators.length) {
    return (
      <div className="cyber-card animate-fade-in" style={{ marginBottom: 20 }}>
        <h3 className="section-title">🔍 Explainable AI: Why Was This Flagged?</h3>
        <p className="muted" style={{ margin: 0 }}>No critical flags or security warnings detected in this submission.</p>
      </div>
    )
  }

  return (
    <div className="cyber-card animate-fade-in" style={{ marginBottom: 20 }}>
      <h3 className="section-title">🔍 Explainable AI: Why Was This Flagged?</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
        {redFlags.map((f, i) => (
          <div
            key={i}
            style={{
              padding: '14px 16px',
              borderRadius: 10,
              background: f.weight >= 20 ? 'var(--red-bg)' : 'var(--amber-bg)',
              border: `1px solid ${f.weight >= 20 ? 'var(--red-border)' : 'var(--amber-border)'}`
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: 14, color: f.weight >= 20 ? 'var(--red)' : '#f97316' }}>
                {f.weight >= 20 ? '🔴 HIGH RISK' : '🟠 MEDIUM RISK'}: {f.label}
              </span>
              <span className="badge-pill badge-gray badge-pill-sm">+ {f.weight} Impact</span>
            </div>
            {f.evidence && (
              <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text)', fontStyle: 'italic', background: 'rgba(255,255,255,0.7)', padding: '6px 12px', borderRadius: 6 }}>
                Detected Quote: "{f.evidence}"
              </div>
            )}
            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              Recommendation: Avoid upfront payment demands and verify credentials independently.
            </div>
          </div>
        ))}

        {positiveIndicators.map((p, i) => (
          <div
            key={`pos-${i}`}
            style={{
              padding: '12px 16px',
              borderRadius: 10,
              background: 'var(--green-bg)',
              border: '1px solid var(--green-border)'
            }}
          >
            <span style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--green)' }}>🟢 SAFE SIGNAL: {p.label}</span>
            {p.evidence && <div style={{ marginTop: 4, fontSize: 12.5, color: 'var(--text)' }}>Evidence: "{p.evidence}"</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
