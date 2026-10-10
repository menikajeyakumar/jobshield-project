import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { loginUser, friendlyError } from '../api.js'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const data = await loginUser(email, password)
      localStorage.removeItem('jobshield_admin_token')
      localStorage.setItem('jobshield_user_token', data.token)
      localStorage.setItem('jobshield_user_email', data.email)
      window.dispatchEvent(new Event('storage'))
      navigate('/verify')
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-split animate-fade-in">
        {/* Left hero panel */}
        <div className="auth-hero-panel">
          <div>
            <div className="auth-hero-shield">🛡️</div>
            <h2>JobShield AI</h2>
            <p>AI-Powered Opportunity Verification & Scam Detection Platform.<br />Verify Before You Trust.</p>
          </div>
          <div className="auth-hero-features">
            <div className="auth-hero-feature"><span>🧠</span><span>Hybrid ML Classifier</span></div>
            <div className="auth-hero-feature"><span>🔍</span><span>OCR & Document Analysis</span></div>
            <div className="auth-hero-feature"><span>📊</span><span>0–100 Risk Score Report</span></div>
            <div className="auth-hero-feature"><span>🗄️</span><span>Real-Time Scam Database</span></div>
          </div>
        </div>

        {/* Right form panel */}
        <div className="auth-form-panel">
          <div style={{ marginBottom: 28 }}>
            <span className="badge badge-blue" style={{ marginBottom: 10, fontSize: 11 }}>SECURE LOGIN</span>
            <h2 style={{ margin: '4px 0 6px', fontSize: 24, fontWeight: 900 }}>Welcome back</h2>
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>Log in to access your scan history and safety reports.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <label className="field-label">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="name@example.com"
              autoComplete="email"
            />

            <label className="field-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              autoComplete="current-password"
            />

            {error && <div className="error-box" style={{ marginTop: 14 }}>⚠️ {error}</div>}

            <button
              className="btn btn-primary btn-block btn-lg"
              style={{ marginTop: 20 }}
              disabled={loading}
            >
              {loading ? '🔄 Logging in…' : '🔑 Log In'}
            </button>
          </form>

          <p className="muted" style={{ fontSize: 13.5, marginTop: 20, textAlign: 'center' }}>
            Don't have an account? <Link to="/register" style={{ fontWeight: 700, color: 'var(--primary)' }}>Create account →</Link>
          </p>

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)', display: 'flex', gap: 16, justifyContent: 'center' }}>
            <span className="muted" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>🔒 256-bit encrypted</span>
            <span className="muted" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>🛡️ Privacy-first</span>
            <span className="muted" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>⚡ Instant access</span>
          </div>
        </div>
      </div>
    </div>
  )
}
