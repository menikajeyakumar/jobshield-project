import React from 'react'

const PROGRESS_STEPS = [
  { label: 'Step 1: Extracting Text & OCR Parsing...', icon: '🔍' },
  { label: 'Step 2: Detecting Contact & UPI Information...', icon: '👤' },
  { label: 'Step 3: Checking Scam Databases & Fingerprints...', icon: '🛡️' },
  { label: 'Step 4: Running ML Fraud Classifier & Heuristics...', icon: '🧠' },
  { label: 'Step 5: Compiling AI Safety Assessment Report...', icon: '📄' },
]

export default function LoadingScanner({ stepIndex = 0 }) {
  return (
    <div className="container" style={{ maxWidth: 580 }}>
      <div className="cyber-card animate-fade-in" style={{ marginTop: 40, padding: 36, textAlign: 'center' }}>
        <div className="radar-container">
          <div className="radar-sweep" />
          <span style={{ fontSize: 36, zIndex: 2 }}>🛡️</span>
        </div>

        <h3 style={{ margin: '0 0 6px', fontSize: 22 }}>Analyzing with JobShield AI…</h3>
        <p className="muted" style={{ fontSize: 13.5, margin: '0 0 24px' }}>
          Running multi-stage OCR extraction, scam pattern database lookup &amp; ML fraud classifier.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left', background: 'var(--bg-subtle)', padding: 18, borderRadius: 12 }}>
          {PROGRESS_STEPS.map((s, idx) => (
            <div
              key={s.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                fontSize: 14,
                fontWeight: idx === stepIndex ? 700 : 500,
                color: idx < stepIndex ? 'var(--green)' : idx === stepIndex ? 'var(--primary)' : 'var(--text-muted)',
              }}
            >
              <span style={{ fontSize: 16 }}>
                {idx < stepIndex ? '✅' : idx === stepIndex ? <span className="spinner" /> : '⚪'}
              </span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        <div className="progress-bar-bg" style={{ marginTop: 24, height: 6 }}>
          <div
            className="progress-bar-fill"
            style={{
              width: `${((stepIndex + 1) / PROGRESS_STEPS.length) * 100}%`,
              background: 'var(--primary)',
              transition: 'width 0.3s ease'
            }}
          />
        </div>
      </div>
    </div>
  )
}
