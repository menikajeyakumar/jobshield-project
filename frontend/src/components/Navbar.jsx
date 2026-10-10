import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'

export default function Navbar({ onToggleSidebar, isSidebarCollapsed }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem('jobshield_user_email'))
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('jobshield_admin_token'))
  const [theme, setTheme] = useState(() => localStorage.getItem('jobshield_theme') || 'light')
  const [lang, setLang] = useState(() => localStorage.getItem('jobshield_lang') || 'en')
  const [showNotifs, setShowNotifs] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('jobshield_theme', theme)
  }, [theme])

  useEffect(() => {
    const handleStorage = () => {
      setUserEmail(localStorage.getItem('jobshield_user_email'))
      setAdminToken(localStorage.getItem('jobshield_admin_token'))
      setLang(localStorage.getItem('jobshield_lang') || 'en')
      setTheme(localStorage.getItem('jobshield_theme') || 'light')
    }
    window.addEventListener('storage', handleStorage)
    window.addEventListener('admin-token-changed', handleStorage)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('admin-token-changed', handleStorage)
    }
  }, [])

  function handleLogout() {
    localStorage.removeItem('jobshield_user_token')
    localStorage.removeItem('jobshield_user_email')
    localStorage.removeItem('jobshield_admin_token')
    setUserEmail(null)
    setAdminToken(null)
    window.dispatchEvent(new Event('storage'))
    window.dispatchEvent(new CustomEvent('admin-token-changed'))
    navigate('/')
  }

  function toggleTheme() {
    setTheme(t => (t === 'light' ? 'dark' : 'light'))
  }

  function handleLangChange(e) {
    const newLang = e.target.value
    setLang(newLang)
    localStorage.setItem('jobshield_lang', newLang)
    window.dispatchEvent(new Event('storage'))
    window.dispatchEvent(new Event('language-change'))
  }

  const getPageName = () => {
    const p = location.pathname
    if (p.includes('/verify-website')) return '🌐 Website Verification'
    if (p.includes('/verify-certificate')) return '📄 Certificate Verification'
    if (p.includes('/verify')) return '🔍 Check Opportunity'
    if (p.includes('/result')) return '📊 AI Safety Assessment'
    if (p.includes('/dashboard')) return '📈 Analytics Dashboard'
    if (p.includes('/history')) return '📜 Scan History'
    if (p.includes('/scam-database')) return '🗄️ Scam Intelligence'
    if (p.includes('/report-scam')) return '🚩 Report a Scam'
    if (p.includes('/admin')) return '🛡️ Admin Center'
    if (p.includes('/profile')) return '👤 User Profile'
    if (p.includes('/safety-center')) return '🛡️ Safety Center'
    if (p === '/' || p.includes('/landing')) return '🏠 JobShield AI'
    return 'JobShield AI'
  }

  return (
    <header className="top-navbar">
      <div className="nav-left">
        {onToggleSidebar && (
          <button
            className="nav-icon-btn"
            onClick={onToggleSidebar}
            title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            aria-label="Toggle Sidebar"
          >
            ☰
          </button>
        )}
        <div className="page-title">
          <span>{getPageName()}</span>
        </div>
      </div>

      <div className="nav-right">
        {/* Language selector */}
        <select
          className="lang-select"
          value={lang}
          onChange={handleLangChange}
          title="Select Language"
        >
          <option value="en">🇺🇸 English</option>
          <option value="ta">🇮🇳 தமிழ் (Tamil)</option>
          <option value="hi">🇮🇳 हिंदी (Hindi)</option>
        </select>

        {/* Dark/Light mode toggle */}
        <button
          className="nav-icon-btn"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button
            className="nav-icon-btn"
            onClick={() => setShowNotifs(s => !s)}
            title="Notifications"
            aria-label="Notifications"
          >
            🔔
            <span className="notif-badge">3</span>
          </button>

          {showNotifs && (
            <div className="notif-popover">
              <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Security Alerts</span>
                <span className="muted" style={{ fontSize: 11, cursor: 'pointer' }} onClick={() => setShowNotifs(false)}>Close</span>
              </div>
              <div className="notif-item">
                <strong style={{ color: 'var(--red)' }}>🔴 High Risk Opportunity Flagged</strong>
                <div className="muted" style={{ fontSize: 12 }}>Part-Time Data Entry ₹4,000/day scam pattern detected.</div>
              </div>
              <div className="notif-item">
                <strong style={{ color: 'var(--amber)' }}>🟠 New Scam Pattern Stored</strong>
                <div className="muted" style={{ fontSize: 12 }}>WhatsApp fake recruitment numbers reported 14 times.</div>
              </div>
              <div className="notif-item">
                <strong style={{ color: 'var(--primary)' }}>🔵 AI Model 2.0 Loaded</strong>
                <div className="muted" style={{ fontSize: 12 }}>TF-IDF + Logistic Regression classifier active.</div>
              </div>
            </div>
          )}
        </div>

        {/* User / Admin profile / Logout */}
        {userEmail ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
              👤 {userEmail.split('@')[0]}
            </span>
            <button className="btn btn-outline btn-sm" onClick={handleLogout}>
              Logout
            </button>
          </div>
        ) : adminToken ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>
              🛡️ Admin Operator
            </span>
            <button className="btn btn-outline btn-sm" onClick={handleLogout}>
              Logout
            </button>
          </div>
        ) : (
          <NavLink to="/login" className="btn btn-primary btn-sm">
            Sign In
          </NavLink>
        )}
      </div>
    </header>
  )
}

