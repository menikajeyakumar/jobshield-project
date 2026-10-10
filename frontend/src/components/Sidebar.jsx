import { NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'

export default function Sidebar({ collapsed, onToggle }) {
  const navigate = useNavigate()
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem('jobshield_user_email'))
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('jobshield_admin_token'))
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    const handleStorage = () => {
      setUserEmail(localStorage.getItem('jobshield_user_email'))
      setAdminToken(localStorage.getItem('jobshield_admin_token'))
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

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-brand">
        <NavLink to="/landing" className="brand" title="JobShield 2.0">
          <span style={{ fontSize: 24 }}>🛡️</span>
          {!collapsed && <span>JobShield</span>}
        </NavLink>
        {onToggle && (
          <button
            onClick={onToggle}
            className="nav-icon-btn"
            style={{ width: 30, height: 30, fontSize: 13, padding: 0 }}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? '▶' : '◀'}
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="brand-tagline" style={{ paddingLeft: 6, marginBottom: 16 }}>
          Verify Before You Trust
        </div>
      )}

      <nav className="sidebar-nav">
        {/* MAIN */}
        <div className="nav-section-title">{!collapsed ? 'MAIN' : '•'}</div>
        <NavLink to="/dashboard" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')} title="Dashboard">
          <span>📊</span>
          {!collapsed && <span>Dashboard</span>}
        </NavLink>

        {/* ANALYZE */}
        <div className="nav-section-title">{!collapsed ? 'ANALYZE' : '•'}</div>
        <NavLink to="/verify" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')} title="Verify Opportunity">
          <span>🔍</span>
          {!collapsed && <span>Verify Opportunity</span>}
        </NavLink>
        <NavLink to="/history" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')} title="Scan History">
          <span>📜</span>
          {!collapsed && <span>Scan History</span>}
        </NavLink>

        {/* SAFETY & INTELLIGENCE */}
        <div className="nav-section-title">{!collapsed ? 'SAFETY CENTER' : '•'}</div>
        <NavLink to="/verify-website" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')} title="Website Verification">
          <span>🌐</span>
          {!collapsed && <span>Website Verification</span>}
        </NavLink>
        <NavLink to="/verify-certificate" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')} title="Certificate Verification">
          <span>📄</span>
          {!collapsed && <span>Certificate Verification</span>}
        </NavLink>
        <NavLink to="/scam-database" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')} title="Scam Intelligence">
          <span>🧠</span>
          {!collapsed && <span>Scam Intelligence</span>}
        </NavLink>
        <NavLink to="/report-scam" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')} title="Reports">
          <span>🚩</span>
          {!collapsed && <span>Submit Report</span>}
        </NavLink>

        {/* USER & ADMIN */}
        <div className="nav-section-title">{!collapsed ? 'ACCOUNT' : '•'}</div>
        <NavLink to="/profile" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')} title="User Profile">
          <span>👤</span>
          {!collapsed && <span>Profile</span>}
        </NavLink>
        {adminToken && (
          <NavLink to="/admin" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')} title="Admin Panel">
            <span>🔑</span>
            {!collapsed && <span>Admin Panel</span>}
          </NavLink>
        )}

        {/* ABOUT */}
        <div className="nav-section-title">{!collapsed ? 'ABOUT' : '•'}</div>
        <NavLink to="/landing" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')} title="About JobShield AI">
          <span>🛡️</span>
          {!collapsed && <span>About JobShield</span>}
        </NavLink>
      </nav>

      {/* BOTTOM */}
      <div className="sidebar-footer">
        {userEmail ? (
          <div className="user-profile">
            {!collapsed ? (
              <>
                <div className="user-email" title={userEmail}>
                  👤 {userEmail.split('@')[0]}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => setShowSettings(s => !s)}
                  >
                    ⚙️
                  </button>
                  <button
                    className="btn btn-outline btn-sm logout-btn"
                    style={{ flex: 2 }}
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <button
                className="btn btn-outline btn-sm"
                onClick={handleLogout}
                title="Logout"
              >
                🚪
              </button>
            )}
          </div>
        ) : adminToken ? (
          <div className="user-profile">
            {!collapsed ? (
              <>
                <div className="user-email" style={{ color: 'var(--primary)', fontWeight: 700 }}>
                  🛡️ Admin Operator
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <button
                    className="btn btn-outline btn-sm logout-btn"
                    style={{ width: '100%' }}
                    onClick={handleLogout}
                  >
                    🚪 Logout
                  </button>
                </div>
              </>
            ) : (
              <button
                className="btn btn-outline btn-sm"
                onClick={handleLogout}
                title="Logout"
              >
                🚪
              </button>
            )}
          </div>
        ) : (
          <div className="auth-buttons">
            {!collapsed ? (
              <>
                <NavLink to="/login" className="sidebar-link login-link" style={{ padding: '8px 12px' }}>
                  🔑 Sign In
                </NavLink>
                <NavLink to="/register" className="btn btn-primary btn-sm register-btn">
                  Create Account
                </NavLink>
              </>
            ) : (
              <NavLink to="/login" className="nav-icon-btn" title="Sign In">
                🔑
              </NavLink>
            )}
          </div>
        )}
      </div>

      {showSettings && (
        <div
          style={{
            position: 'absolute',
            bottom: 70,
            left: 14,
            right: 14,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 14,
            boxShadow: 'var(--shadow-lg)',
            zIndex: 150,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, fontWeight: 700 }}>
            <span>⚙️ Quick Settings</span>
            <span style={{ cursor: 'pointer' }} onClick={() => setShowSettings(false)}>✕</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <div>• Theme: Active</div>
            <div>• Detection Engine: Hybrid (Rules + ML)</div>
            <div>• Database: Connected (jobshield)</div>
          </div>
        </div>
      )}
    </aside>
  )
}

