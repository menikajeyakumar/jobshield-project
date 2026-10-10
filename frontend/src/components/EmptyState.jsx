import React from 'react'

export default function EmptyState({ icon = '📜', title, description, actionText, onAction }) {
  return (
    <div className="cyber-card center animate-fade-in" style={{ padding: '40px 24px', marginTop: 20 }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
      <h3 style={{ margin: '0 0 8px', fontSize: 20 }}>{title}</h3>
      <p className="muted" style={{ maxWidth: 440, margin: '0 auto 20px', fontSize: 14, lineHeight: 1.6 }}>
        {description}
      </p>
      {actionText && onAction && (
        <button className="btn btn-primary" onClick={onAction}>
          {actionText}
        </button>
      )}
    </div>
  )
}
