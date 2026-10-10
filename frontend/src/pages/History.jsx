import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getHistory, deleteHistoryItem, friendlyError } from '../api.js'
import RiskBadge from '../components/RiskBadge.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { categoryLabel, CATEGORY_OPTIONS } from '../categories.js'
import { formatScanDate } from '../utils/date.js'

export default function History() {
  const [items, setItems] = useState(null)
  const [filtered, setFiltered] = useState([])
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [timeFilter, setTimeFilter] = useState('all')
  const [riskFilter, setRiskFilter] = useState('all')
  const [catFilter, setCatFilter] = useState('all')
  const navigate = useNavigate()

  useEffect(() => { load() }, [])

  function load() {
    getHistory()
      .then(d => { setItems(d || []); setFiltered(d || []) })
      .catch(err => setError(friendlyError(err)))
  }

  useEffect(() => {
    if (!items) return
    let res = [...items]
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      res = res.filter(i =>
        (i.organization && i.organization.toLowerCase().includes(q)) ||
        (i.title && i.title.toLowerCase().includes(q)) ||
        (i.category && i.category.toLowerCase().includes(q)) ||
        (i.raw_text && i.raw_text.toLowerCase().includes(q))
      )
    }
    if (timeFilter !== 'all') {
      const now = new Date()
      res = res.filter(i => {
        const diffDays = (now - new Date(i.created_at)) / (1000 * 60 * 60 * 24)
        if (timeFilter === 'today') return diffDays <= 1
        if (timeFilter === 'week') return diffDays <= 7
        if (timeFilter === 'month') return diffDays <= 30
        return true
      })
    }
    if (riskFilter !== 'all') {
      res = res.filter(i => {
        if (riskFilter === 'low') return i.classification === 'likely_genuine' || i.risk_score <= 30
        if (riskFilter === 'suspicious') return i.classification === 'suspicious' || (i.risk_score > 30 && i.risk_score <= 65)
        if (riskFilter === 'high') return i.classification === 'likely_fake' || i.risk_score > 65
        return true
      })
    }
    if (catFilter !== 'all') {
      res = res.filter(i => i.category === catFilter)
    }
    setFiltered(res)
  }, [items, search, timeFilter, riskFilter, catFilter])

  async function handleDelete(id, e) {
    e.stopPropagation()
    try {
      await deleteHistoryItem(id)
      setItems(prev => prev.filter(i => i.id !== id))
    } catch (err) {
      setError(friendlyError(err))
    }
  }

  function clearFilters() {
    setSearch(''); setTimeFilter('all'); setRiskFilter('all'); setCatFilter('all')
  }

  const hasActiveFilter = search.trim() || timeFilter !== 'all' || riskFilter !== 'all' || catFilter !== 'all'

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: 60 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 24 }}>
        <div>
          <span className="badge-pill badge-gray" style={{ marginBottom: 8, fontSize: 11 }}>AUDIT TRAIL</span>
          <h2 style={{ fontSize: 26, margin: '4px 0 4px', letterSpacing: '-0.3px' }}>Scan History</h2>
          <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>Review, export, and manage your verified opportunities.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/verify')}>
          🔍 Check New Opportunity
        </button>
      </div>

      {error && <div className="error-box" style={{ marginBottom: 16 }}>⚠️ {error}</div>}

      {/* Filter Bar */}
      <div className="cyber-card" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 12, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="🔍  Search by company, title, keywords…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ margin: 0 }}
          />
          <select value={timeFilter} onChange={e => setTimeFilter(e.target.value)} style={{ margin: 0 }}>
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          <select value={riskFilter} onChange={e => setRiskFilter(e.target.value)} style={{ margin: 0 }}>
            <option value="all">All Risk Levels</option>
            <option value="low">🟢 Low Risk (≤30)</option>
            <option value="suspicious">🟡 Suspicious (31–65)</option>
            <option value="high">🔴 High Risk (66+)</option>
          </select>
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ margin: 0 }}>
            <option value="all">All Categories</option>
            {CATEGORY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        {hasActiveFilter && (
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="muted" style={{ fontSize: 12.5 }}>
              Showing {filtered.length} of {items?.length || 0} scans
            </span>
            <button className="btn btn-outline btn-sm" style={{ fontSize: 11, padding: '2px 10px' }} onClick={clearFilters}>
              ✕ Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Empty states */}
      {items && items.length === 0 && (
        <EmptyState
          icon="📜"
          title="No scan history yet"
          message="When you analyze job posters, messages, or application links, they'll be archived here for reference."
          actionLabel="Check an Opportunity"
          onAction={() => navigate('/verify')}
        />
      )}

      {items && items.length > 0 && filtered.length === 0 && (
        <div className="cyber-card center" style={{ padding: 30 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🔎</div>
          <p className="muted" style={{ marginBottom: 14 }}>No scans match your current filter settings.</p>
          <button className="btn btn-outline btn-sm" onClick={clearFilters}>Clear Filters</button>
        </div>
      )}

      {/* Results table */}
      {filtered.length > 0 && (
        <div className="cyber-card" style={{ overflowX: 'auto', padding: 0 }}>
          <table className="history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Opportunity / Organization</th>
                <th>Category</th>
                <th>Risk Score</th>
                <th>Safety Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const { date, time } = formatScanDate(item.created_at)
                return (
                  <tr key={item.id} onClick={() => navigate(`/result/${item.id}`)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontSize: 12.5, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {date}
                      <div style={{ fontSize: 11 }}>{time}</div>
                    </td>
                  <td>
                    <strong style={{ fontSize: 14 }}>{item.organization || item.title || 'Untitled Opportunity'}</strong>
                    {item.title && item.organization && <div className="muted" style={{ fontSize: 12 }}>{item.title}</div>}
                  </td>
                  <td>
                    <span className="badge-pill badge-gray" style={{ fontSize: 11.5 }}>{categoryLabel(item.category)}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        fontWeight: 900, fontSize: 15,
                        color: item.risk_score > 65 ? 'var(--red)' : item.risk_score > 30 ? 'var(--amber)' : 'var(--green)'
                      }}>
                        {item.risk_score}
                      </span>
                      <span className="muted" style={{ fontSize: 11 }}>/100</span>
                    </div>
                    <div className="progress-bar-bg" style={{ marginTop: 4, width: 64 }}>
                      <div className="progress-bar-fill" style={{
                        width: `${item.risk_score}%`,
                        background: item.risk_score > 65 ? 'var(--red)' : item.risk_score > 30 ? 'var(--amber)' : 'var(--green)'
                      }} />
                    </div>
                  </td>
                  <td><RiskBadge classification={item.classification} /></td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={e => { e.stopPropagation(); navigate(`/result/${item.id}`) }}
                      >
                        View Report
                      </button>
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ color: 'var(--red)', borderColor: 'var(--red-border)' }}
                        onClick={e => handleDelete(item.id, e)}
                        title="Delete Scan"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary footer */}
      {items && items.length > 0 && (
        <div style={{ marginTop: 16, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <span className="muted" style={{ fontSize: 13 }}>
            Total scans: <strong>{items.length}</strong>
          </span>
          <span className="muted" style={{ fontSize: 13 }}>
            High risk: <strong style={{ color: 'var(--red)' }}>{items.filter(i => i.risk_score > 65).length}</strong>
          </span>
          <span className="muted" style={{ fontSize: 13 }}>
            Safe: <strong style={{ color: 'var(--green)' }}>{items.filter(i => i.risk_score <= 30).length}</strong>
          </span>
        </div>
      )}
    </div>
  )
}
