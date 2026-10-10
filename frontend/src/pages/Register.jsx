import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { registerUser, friendlyError } from '../api.js'

export default function Register() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await registerUser(email, password)
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
            <h2>Join JobShield AI</h2>
            <p>Create your free account to save scan history, access personalized safety reports, and protect yourself from recruitment fraud.</p>
          </div>
          <div className="auth-hero-features">
            <div className="auth-hero-feature"><span>✅</span><span>Free unlimited scans</span></div>
            <div className="auth-hero-feature"><span>📜</span><span>Persistent scan history</span></div>
            <div className="auth-hero-feature"><span>🔔</span><span>Scam pattern alerts</span></div>
            <div className="auth-hero-feature"><span>🌍</span><span>Multilingual reports (EN / TA / HI)</span></div>
          </div>
        </div>

        {/* Right form panel */}
        <div className="auth-form-panel">
          <div style={{ marginBottom: 28 }}>
            <span className="badge badge-green" style={{ marginBottom: 10, fontSize: 11 }}>CREATE ACCOUNT</span>
            <h2 style={{ margin: '4px 0 6px', fontSize: 24, fontWeight: 900 }}>Get protected today</h2>
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>Sign up for free — no credit card required.</p>
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
              placeholder="Min. 6 characters"
              minLength={6}
              autoComplete="new-password"
            />

            <label className="field-label">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              placeholder="Repeat your password"
              minLength={6}
              autoComplete="new-password"
            />

            {error && <div className="error-box" style={{ marginTop: 14 }}>⚠️ {error}</div>}

            <button
              className="btn btn-primary btn-block btn-lg"
              style={{ marginTop: 20 }}
              disabled={loading}
            >
              {loading ? '🔄 Creating account…' : '🚀 Create Account'}
            </button>
          </form>

          <p className="muted" style={{ fontSize: 13.5, marginTop: 20, textAlign: 'center' }}>
            Already have an account? <Link to="/login" style={{ fontWeight: 700, color: 'var(--primary)' }}>Log in →</Link>
          </p>

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)', display: 'flex', gap: 16, justifyContent: 'center' }}>
            <span className="muted" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>🔒 256-bit encrypted</span>
            <span className="muted" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>🛡️ Privacy-first</span>
            <span className="muted" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>💯 Always free</span>
          </div>
        </div>
      </div>
    </div>
  )
}
