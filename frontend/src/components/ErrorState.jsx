import React from 'react'

export default function ErrorState({ title = "Something went wrong", message, onRetry }) {
  return (
    <div className="error-box animate-fade-in" style={{ padding: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 22 }}>⚠️</span>
        <div>
          <strong style={{ fontSize: 14, display: 'block' }}>{title}</strong>
          <span style={{ fontSize: 13, opacity: 0.9 }}>{message}</span>
        </div>
      </div>
      {onRetry && (
        <button className="btn btn-outline btn-sm" style={{ color: 'var(--red)', borderColor: 'var(--red-border)' }} onClick={onRetry}>
          🔄 Retry
        </button>
      )}
    </div>
  )
}
