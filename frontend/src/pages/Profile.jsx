import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getHistory } from '../api.js'

export default function Profile() {
  const navigate = useNavigate()
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem('jobshield_user_email'))
  const [theme, setTheme] = useState(() => localStorage.getItem('jobshield_theme') || 'light')
  const [lang, setLang] = useState(() => localStorage.getItem('jobshield_lang') || 'en')
  const [scanCount, setScanCount] = useState(0)

  useEffect(() => {
    getHistory()
      .then(data => setScanCount(data?.length || 0))
      .catch(() => setScanCount(0))
  }, [])

  function handleLogout() {
    localStorage.removeItem('jobshield_user_token')
    localStorage.removeItem('jobshield_user_email')
    localStorage.removeItem('jobshield_admin_token')
    window.dispatchEvent(new Event('storage'))
    navigate('/')
  }

  function handleThemeChange(newTheme) {
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('jobshield_theme', newTheme)
    window.dispatchEvent(new Event('storage'))
  }

  function handleLangChange(newLang) {
    setLang(newLang)
    localStorage.setItem('jobshield_lang', newLang)
    window.dispatchEvent(new Event('storage'))
    window.dispatchEvent(new Event('language-change'))
  }

  return (
    <div className="container" style={{ maxWidth: 780, paddingBottom: 60 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 className="mb-0">👤 User Profile &amp; Security Settings</h2>
        <p className="muted" style={{ marginTop: 4 }}>
          Manage your account preferences, view scan statistics, and configure platform security defaults.
        </p>
      </div>

      <div className="cyber-card animate-fade-in" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, color: '#fff', fontWeight: 800 }}>
            {userEmail ? userEmail[0].toUpperCase() : '👤'}
          </div>

          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 20 }}>
              {userEmail ? userEmail : 'Anonymous Guest User'}
            </h3>
            <span className="badge-pill badge-blue badge-pill-sm">
              {userEmail ? 'Registered Account' : 'Guest Browser Session'}
            </span>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>
              Session Token: <code>{localStorage.getItem('jobshield_session_id') || 'Active'}</code>
            </div>
          </div>

          {userEmail ? (
            <button className="btn btn-outline" style={{ color: 'var(--red)', borderColor: 'var(--red-border)' }} onClick={handleLogout}>
              Logout Account
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => navigate('/login')}>
              Sign In / Register
            </button>
          )}
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="cyber-card">
          <h4 style={{ margin: '0 0 10px', fontSize: 15 }}>📊 Personal Usage Summary</h4>
          <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--primary)' }}>{scanCount}</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>Scans Archived in History</div>
          <button className="btn btn-outline btn-sm" style={{ marginTop: 14 }} onClick={() => navigate('/history')}>
            View History →
          </button>
        </div>

        <div className="cyber-card">
          <h4 style={{ margin: '0 0 10px', fontSize: 15 }}>🛡️ Security Protection Status</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
            <div>✅ <strong>Rule Engine:</strong> 60% Weight Active</div>
            <div>✅ <strong>ML Fraud Model:</strong> 40% Weight Active</div>
            <div>✅ <strong>Domain WHOIS &amp; SSL:</strong> Enabled</div>
          </div>
        </div>
      </div>

      <div className="cyber-card animate-fade-in">
        <h3 className="section-title">⚙️ Preferences &amp; Accessibility</h3>

        <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: 16, marginBottom: 16 }}>
          <label className="field-label" style={{ marginTop: 0 }}>Interface Theme Mode</label>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className={`btn ${theme === 'light' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => handleThemeChange('light')}
            >
              ☀️ Light Theme
            </button>
            <button
              className={`btn ${theme === 'dark' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => handleThemeChange('dark')}
            >
              🌙 Dark Theme
            </button>
          </div>
        </div>

        <div>
          <label className="field-label" style={{ marginTop: 0 }}>Preferred Guidance Language</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { id: 'en', label: '🇺🇸 English' },
              { id: 'ta', label: '🇮🇳 தமிழ் (Tamil)' },
              { id: 'hi', label: '🇮🇳 हिंदी (Hindi)' }
            ].map(l => (
              <button
                key={l.id}
                className={`btn ${lang === l.id ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => handleLangChange(l.id)}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
