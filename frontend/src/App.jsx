import { useState, useEffect } from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar.jsx'
import TopNavbar from './components/Navbar.jsx'
import Landing from './pages/Landing.jsx'
import Verify from './pages/Verify.jsx'
import Result from './pages/Result.jsx'
import Dashboard from './pages/Dashboard.jsx'
import History from './pages/History.jsx'
import Admin from './pages/Admin.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Profile from './pages/Profile.jsx'

// Modular Page & Component Imports
import WebsiteVerifyPage from './pages/WebsiteVerifyPage.jsx'
import CertificateVerifyPage from './pages/CertificateVerifyPage.jsx'
import ScamDatabasePage from './pages/ScamDatabasePage.jsx'
import ReportScamPage from './pages/ReportScamPage.jsx'
import AIChatAssistant from './components/AIChatAssistant.jsx'

function AppShell() {
  const location = useLocation()
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('jobshield_admin_token'))
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const path = location.pathname

  useEffect(() => {
    const handleStorage = () => {
      setAdminToken(localStorage.getItem('jobshield_admin_token'))
    }
    window.addEventListener('storage', handleStorage)
    window.addEventListener('admin-token-changed', handleStorage)
    setAdminToken(localStorage.getItem('jobshield_admin_token'))
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('admin-token-changed', handleStorage)
    }
  }, [location.pathname])

  // Auth pages (Login, Register, and logged-out Admin login) are centered fullscreen without sidebar
  const isAuthPage =
    path === '/login' ||
    path === '/register' ||
    (path === '/admin' && !adminToken)

  if (isAuthPage) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </div>
    )
  }

  // Authenticated Admin inside /admin gets dedicated Admin layout without normal user sidebar
  if (path === '/admin' && adminToken) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '20px 0' }}>
        <Routes>
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </div>
    )
  }

  // All inner pages render with responsive Sidebar, TopNavbar, content area, and floating AI assistant
  return (
    <div className={`app-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(c => !c)} />
      <div className="main-content">
        <TopNavbar onToggleSidebar={() => setSidebarCollapsed(c => !c)} isSidebarCollapsed={sidebarCollapsed} />
        <div className="content-body">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/landing" element={<Landing />} />
            <Route path="/verify" element={<Verify />} />
            <Route path="/result/:id" element={<Result />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/history" element={<History />} />
            <Route path="/verify-website" element={<WebsiteVerifyPage />} />
            <Route path="/verify-certificate" element={<CertificateVerifyPage />} />
            <Route path="/scam-database" element={<ScamDatabasePage />} />
            <Route path="/report-scam" element={<ReportScamPage />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <div className="footer">
          🛡️ JobShield AI – Verify Before You Trust. AI-Powered Opportunity Verification &amp; Scam Detection Platform.
        </div>
      </div>

      {/* Floating AI Chat Assistant */}
      <AIChatAssistant />
    </div>
  )
}

export default function App() {
  return <AppShell />
}
