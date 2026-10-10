import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { verifyWebsite, friendlyError } from '../api.js'
import RiskBadge from '../components/RiskBadge.jsx'

export default function WebsiteVerifyPage() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const SAMPLES = [
    { label: '🔴 Phishing Scam', url: 'https://careers-google-verify.top/apply' },
    { label: '🔴 Fake TCS Portal', url: 'https://tcs-recruitment-offer.in.net' },
    { label: '🟢 Legitimate Corporate', url: 'https://careers.google.com' }
  ]

  async function analyzeWebsite(targetUrl) {
    const inputUrl = targetUrl || url
    if (!inputUrl || inputUrl.trim().length < 4) return

    setLoading(true)
    setResult(null)
    setError(null)

    try {
      const data = await verifyWebsite(inputUrl)
      setResult(data)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  const getGaugeColor = s => (s >= 65 ? 'var(--red)' : s >= 35 ? 'var(--amber)' : 'var(--green)')

  return (
    <div className="container" style={{ paddingBottom: 60 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 className="mb-0">🌐 Website &amp; Domain Verification</h2>
        <p className="muted" style={{ marginTop: 4 }}>
          Inspect recruitment portals, company career pages, and application URLs for phishing, spoofing, and fake domains.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <form onSubmit={e => { e.preventDefault(); analyzeWebsite(); }}>
          <label className="field-label" style={{ marginTop: 0 }}>Website URL or Domain</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="e.g. https://careers.company.com or http://fake-job-portal.top"
              value={url}
              onChange={e => setUrl(e.target.value)}
              style={{ flex: 1, minWidth: 260 }}
              required
            />
            <button className="btn btn-primary" disabled={loading} style={{ minWidth: 160 }}>
              {loading ? <><span className="spinner" /> Inspecting…</> : '🔍 Verify Website'}
            </button>
          </div>
        </form>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 14, flexWrap: 'wrap' }}>
          <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>Quick Samples:</span>
          {SAMPLES.map(s => (
            <button
              key={s.label}
              className="btn btn-outline btn-sm"
              style={{ fontSize: 12, padding: '4px 10px' }}
              onClick={() => { setUrl(s.url); analyzeWebsite(s.url); }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="error-box" style={{ marginBottom: 16 }}>⚠️ {error}</div>}

      {loading && (
        <div className="card center" style={{ padding: '40px 20px' }}>
          <div className="spinner" style={{ width: 32, height: 32, marginBottom: 12 }} />
          <h4 style={{ margin: '0 0 6px' }}>Inspecting Domain Security Records</h4>
          <p className="muted" style={{ fontSize: 13, margin: 0 }}>
            Analyzing WHOIS age, SSL validity, typosquatting risk, and phishing databases…
          </p>
        </div>
      )}

      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ position: 'relative', width: 90, height: 90 }}>
                <svg width="90" height="90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border)" strokeWidth="10" />
                  <circle
                    cx="50" cy="50" r="40" fill="none"
                    stroke={getGaugeColor(result.score)}
                    strokeWidth="10"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 - (251.2 * result.score) / 100}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 20, fontWeight: 800, color: getGaugeColor(result.score) }}>{result.score}</span>
                  <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600 }}>/ 100</span>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <RiskBadge classification={result.classification} />
                  <span style={{ fontSize: 14, fontWeight: 700 }}>
                    {result.score >= 65 ? '🔴 High Risk Phishing Portal' : result.score >= 35 ? '🟠 Suspicious Website' : '🟢 Verified Domain Security'}
                  </span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 800 }}>{result.domain}</div>
                <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>{result.url}</div>
              </div>
            </div>

            <button
              className="btn btn-outline"
              onClick={() => navigate(`/verify?url=${encodeURIComponent(result.url)}`)}
            >
              🔍 Scan Opportunity Text on This URL →
            </button>
          </div>

          <div className="card">
            <h3 className="section-title">Security Inspection Breakdown</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {result.checks.map((chk, i) => (
                <div key={i} className="check-step-item">
                  <span style={{ fontSize: 20 }}>
                    {chk.status === 'safe' ? '✅' : chk.status === 'warning' ? '⚠️' : '❌'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{chk.name}</div>
                    <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>{chk.detail}</div>
                  </div>
                  <span
                    className={`badge badge-${chk.status === 'safe' ? 'green' : chk.status === 'warning' ? 'amber' : 'red'}`}
                    style={{ fontSize: 11 }}
                  >
                    {chk.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ background: result.score >= 65 ? 'var(--red-bg)' : 'var(--surface)', border: result.score >= 65 ? '1px solid var(--red-border)' : '1px solid var(--border)' }}>
            <h4 style={{ margin: '0 0 10px', color: result.score >= 65 ? 'var(--red)' : 'var(--text)' }}>
              🛡️ Safe Browsing Recommendations
            </h4>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13.5, lineHeight: 1.7, color: result.score >= 65 ? 'var(--red)' : 'var(--text-muted)' }}>
              <li><strong>Never enter login credentials or bank details</strong> on unverified recruitment websites.</li>
              <li>Always cross-check job openings on the official corporate career page.</li>
              <li>Scammers frequently use disposable top-level domains like <code>.top</code>, <code>.xyz</code>, and <code>.site</code>.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
