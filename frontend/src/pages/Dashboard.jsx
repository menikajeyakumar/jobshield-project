import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboardStats, getHistory, friendlyError } from '../api.js'
import RiskBadge from '../components/RiskBadge.jsx'
import ErrorState from '../components/ErrorState.jsx'
import { formatScanDate } from '../utils/date.js'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from 'recharts'

const RISK_COLORS = ['#10b981', '#f59e0b', '#ef4444']
const CAT_COLORS = ['#2563eb', '#10b981', '#f97316', '#ef4444', '#64748b', '#8b5cf6', '#06b6d4', '#ec4899', '#eab308', '#14b8a6']

const SAFETY_TIPS = [
  'Never pay a "registration", "training", or "security deposit" fee to confirm a job or internship offer.',
  'Never share OTPs, passwords, or banking PINs with a recruiter — no legitimate employer needs them.',
  'Independently verify an organization through its official corporate website/careers page.',
  'Be cautious of "guaranteed job", "guaranteed income", or "no interview required" promises.',
  'Urgency tactics like "limited seats" or "pay in the next 10 minutes" are strong red flag indicators.',
]

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [recentScans, setRecentScans] = useState([])
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch(err => setError(friendlyError(err)))

    getHistory()
      .then(data => setRecentScans((data || []).slice(0, 5)))
      .catch(() => setRecentScans([]))
  }, [])

  if (error) {
    return (
      <div className="container" style={{ paddingTop: 30 }}>
        <ErrorState title="Failed to Load Dashboard Statistics" message={error} onRetry={() => window.location.reload()} />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="container center" style={{ marginTop: 80 }}>
        <div className="spinner" style={{ width: 32, height: 32, marginBottom: 14 }} />
        <div className="muted" style={{ fontSize: 14 }}>Compiling Security Intelligence Dashboard…</div>
      </div>
    )
  }

  const riskData = stats.risk_distribution || []
  const catData = stats.category_distribution || []
  const monthly = stats.monthly_analysis || []
  const flags = stats.most_common_red_flags || []

  return (
    <div className="container" style={{ paddingBottom: 60 }}>
      {/* Header Banner & Quick Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <span className="badge-pill badge-blue badge-pill-sm" style={{ marginBottom: 6 }}>
            🛡️ LIVE SECURITY INTELLIGENCE
          </span>
          <h2 style={{ fontSize: 28, margin: '4px 0', letterSpacing: '-0.4px' }}>
            JobShield AI Dashboard
          </h2>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>
            AI-Powered Opportunity Verification &amp; Scam Detection Analytics
          </p>
        </div>

        <button className="btn btn-primary btn-lg" onClick={() => navigate('/verify')}>
          🔍 Quick Scan Opportunity →
        </button>
      </div>

      {/* Primary 4 Stat Cards */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="cyber-card stat-card">
          <div className="num" style={{ color: 'var(--primary)' }}>{stats.total_checked}</div>
          <div className="label">Total Scans</div>
        </div>
        <div className="cyber-card stat-card">
          <div className="num" style={{ color: 'var(--green)' }}>{stats.likely_genuine}</div>
          <div className="label">Safe Scans (Genuine)</div>
        </div>
        <div className="cyber-card stat-card">
          <div className="num" style={{ color: '#f97316' }}>{stats.suspicious}</div>
          <div className="label">Suspicious Scans</div>
        </div>
        <div className="cyber-card stat-card">
          <div className="num" style={{ color: 'var(--red)' }}>{stats.likely_fake}</div>
          <div className="label">High Risk Scans (Fake)</div>
        </div>
      </div>

      {/* Secondary Metric Bar */}
      <div className="cyber-card" style={{ padding: '16px 24px', marginBottom: 24, display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 16, textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{stats.total_reports}</div>
          <div className="muted" style={{ fontSize: 12 }}>Community Reports</div>
        </div>
        <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--red)' }}>{stats.scam_pattern_matches}</div>
          <div className="muted" style={{ fontSize: 12 }}>Scam Pattern Matches</div>
        </div>
        <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#f97316' }}>{stats.duplicate_matches}</div>
          <div className="muted" style={{ fontSize: 12 }}>Duplicate Fraud Posts</div>
        </div>
        <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--red)' }}>{stats.payment_risk_cases}</div>
          <div className="muted" style={{ fontSize: 12 }}>Fee Fraud Demands</div>
        </div>
      </div>

      {/* Recharts Analytics Section */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="cyber-card">
          <h3 className="section-title">📊 Risk Level Distribution</h3>
          {riskData.every(r => r.count === 0) ? (
            <p className="muted">No scan data logged yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={riskData} dataKey="count" nameKey="label" outerRadius={85} label={({ label }) => label}>
                  {riskData.map((entry, i) => <Cell key={i} fill={RISK_COLORS[i % RISK_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="cyber-card">
          <h3 className="section-title">💼 Category Distribution</h3>
          {catData.length === 0 ? (
            <p className="muted">No category data logged yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={catData} dataKey="count" nameKey="category" outerRadius={85} label={({ category }) => category}>
                  {catData.map((entry, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="cyber-card">
          <h3 className="section-title">📈 Monthly Scan Velocity</h3>
          {monthly.length === 0 ? (
            <p className="muted">No historical monthly data logged yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" fontSize={12} stroke="var(--text-muted)" />
                <YAxis fontSize={12} allowDecimals={false} stroke="var(--text-muted)" />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="cyber-card">
          <h3 className="section-title">⚠️ Most Common Scam Red Flags</h3>
          {flags.length === 0 ? (
            <p className="muted">No red flag data logged yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={flags} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" fontSize={11} allowDecimals={false} stroke="var(--text-muted)" />
                <YAxis type="category" dataKey="label" width={150} fontSize={11} stroke="var(--text-muted)" />
                <Tooltip />
                <Bar dataKey="count" fill="var(--primary)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Scans Table */}
      <div className="cyber-card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 className="section-title mb-0">📜 Recent Opportunity Scans</h3>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/history')}>
            View All Scans →
          </button>
        </div>

        {recentScans.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>No recent scans recorded. Click "Quick Scan Opportunity" to test a job offer.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="history-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 8px' }}>Date</th>
                  <th style={{ padding: '10px 8px' }}>Opportunity / Company</th>
                  <th style={{ padding: '10px 8px' }}>Risk Score</th>
                  <th style={{ padding: '10px 8px' }}>Safety Status</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentScans.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }} onClick={() => navigate(`/result/${item.id}`)}>
                    <td style={{ padding: '12px 8px', color: 'var(--text-muted)', fontSize: 12.5 }}>
                      {formatScanDate(item.created_at).date}
                    </td>
                    <td style={{ padding: '12px 8px', fontWeight: 600 }}>
                      {item.organization || item.title || 'Job Opportunity'}
                    </td>
                    <td style={{ padding: '12px 8px', fontWeight: 800 }}>
                      {item.risk_score} / 100
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <RiskBadge classification={item.classification} size="sm" />
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                      <button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); navigate(`/result/${item.id}`); }}>
                        View Result
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Safety Tips Card */}
      <div className="cyber-card">
        <h3 className="section-title">🛡️ JobShield Safety Protocols</h3>
        <ul style={{ lineHeight: 1.9, paddingLeft: 20, margin: 0, fontSize: 13.5 }}>
          {SAFETY_TIPS.map((t, i) => <li key={i}>{t}</li>)}
        </ul>
      </div>
    </div>
  )
}
