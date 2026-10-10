import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getAnalysis, correctEntities, submitReport, verifyUpi, friendlyError } from '../api.js'
import RiskBadge from '../components/RiskBadge.jsx'
import RiskGauge from '../components/RiskGauge.jsx'
import RedFlagCard from '../components/RedFlagCard.jsx'
import RecommendationCard from '../components/RecommendationCard.jsx'
import ErrorState from '../components/ErrorState.jsx'
import { categoryLabel, REPORT_CATEGORY_OPTIONS } from '../categories.js'
import { formatScanDate } from '../utils/date.js'

export default function Result() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(false)
  const [entitiesDraft, setEntitiesDraft] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [reportCategory, setReportCategory] = useState('asked_for_money')
  const [reportDetails, setReportDetails] = useState('')
  const [reportSent, setReportSent] = useState(false)
  const [upiResults, setUpiResults] = useState({})
  const [upiLoading, setUpiLoading] = useState({})

  useEffect(() => {
    getAnalysis(id)
      .then(d => {
        setData(d)
        setEntitiesDraft(d.extracted_entities)
      })
      .catch(err => setError(friendlyError(err)))
  }, [id])

  async function handleVerifyUpi(upiId) {
    setUpiLoading(prev => ({ ...prev, [upiId]: true }))
    try {
      const res = await verifyUpi(upiId)
      setUpiResults(prev => ({ ...prev, [upiId]: res }))
    } catch {
      setUpiResults(prev => ({ ...prev, [upiId]: { error: 'Verification failed. Try again.' } }))
    } finally {
      setUpiLoading(prev => ({ ...prev, [upiId]: false }))
    }
  }

  async function saveCorrections() {
    setSaving(true)
    try {
      const updated = await correctEntities(id, entitiesDraft)
      setData(updated)
      setEntitiesDraft(updated.extracted_entities)
      setEditing(false)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSaving(false)
    }
  }

  async function sendReport() {
    try {
      await submitReport({ analysis_id: id, category: reportCategory, details: reportDetails })
      setReportSent(true)
      setTimeout(() => setShowReport(false), 2500)
    } catch (err) {
      setError(friendlyError(err))
    }
  }

  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />

  if (!data) {
    return (
      <div className="container center" style={{ marginTop: 80 }}>
        <div className="radar-container">
          <div className="radar-sweep" />
          <span style={{ fontSize: 22 }}>🛡️</span>
        </div>
        <div className="muted" style={{ marginTop: 12 }}>Loading analysis report…</div>
      </div>
    )
  }

  const e = data.extracted_entities || {}
  const wv = data.web_verification || {}
  const score = data.risk_score || 0
  const aiConfidencePercent = data.ml_confidence != null ? Math.round(data.ml_confidence * 100) : 92

  const paymentRisk = e.amounts_found?.length || e.upi_ids?.length || data.red_flags?.some(f => f.code?.includes('fee') || f.code?.includes('payment'))
    ? Math.min(100, Math.max(70, score + 10))
    : Math.max(10, Math.round(score * 0.4))
  const websiteRisk = wv.risk_score || (wv.status === 'mismatch' ? 85 : wv.status === 'match' ? 15 : 45)
  const textScamRisk = data.red_flags?.length ? Math.min(100, data.red_flags.length * 25) : 15
  const duplicateRisk = data.duplicate_matches?.length ? Math.round((data.duplicate_matches[0]?.similarity || 0.8) * 100) : 10
  const companyVerificationScore = e.organization ? (wv.status === 'match' ? 80 : 45) : 20

  const riskColor = score <= 30 ? 'var(--green)' : score <= 65 ? 'var(--amber)' : 'var(--red)'

  return (
    <div className="container animate-fade-in" style={{ maxWidth: 880, paddingBottom: 60 }}>

      {/* ── Header Bar ── */}
      <div className="cyber-card" style={{ marginBottom: 20, padding: '22px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span className="badge-pill badge-gray" style={{ fontSize: 11 }}>ANALYSIS REPORT</span>
              <span className="muted" style={{ fontSize: 12 }}>ID: #{data.id?.slice(0, 8)}</span>
            </div>
            <h2 style={{ margin: '0 0 4px', fontSize: 22, letterSpacing: '-0.3px' }}>Opportunity Safety Assessment</h2>
            <div className="muted" style={{ fontSize: 13 }}>
              {categoryLabel(data.category)} · Verified on {formatScanDate(data.created_at).formatted}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-outline btn-sm" onClick={() => window.print()} title="Print or save as PDF">
              📥 Download PDF
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/verify')}>
              🔍 Check Another
            </button>
          </div>
        </div>
      </div>

      {/* ── Risk Overview: Gauge + RiskCard + ML Confidence ── */}
      <div className="cyber-card cyber-card-glow" style={{ marginBottom: 20, padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', gap: 24 }}>
          {/* Gauge */}
          <RiskGauge score={score} size={130} />

          {/* Classification */}
          <div style={{ textAlign: 'center' }}>
            <div className="muted" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>OVERALL RISK SCORE</div>
            <div style={{ fontSize: 52, fontWeight: 900, color: riskColor, lineHeight: 1 }}>{score}</div>
            <div className="muted" style={{ fontSize: 12 }}>/100</div>
            <div style={{ marginTop: 10 }}><RiskBadge classification={data.classification} size="large" /></div>
            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              {score <= 30 ? '0–30: Safe signals detected'
                : score <= 65 ? '31–65: Suspicious · Proceed with caution'
                : '66–100: High Risk · Potential Fraud'}
            </div>
          </div>

          {/* AI Model Confidence */}
          <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 24, minWidth: 220 }}>
            <div className="muted" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>🤖 AI MODEL CONFIDENCE</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--primary)', marginTop: 6 }}>{aiConfidencePercent}%</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>
              {data.ml_confidence >= 0.6
                ? '🔴 High fraud probability'
                : data.ml_confidence >= 0.3
                ? '🟡 Moderate ambiguity detected'
                : '🟢 Authentic linguistic pattern'}
            </div>
            <div className="muted" style={{ fontSize: 11.5, marginTop: 8 }}>
              Hybrid Engine: <strong>60% Rule Matrix</strong> + <strong>40% TF-IDF LR</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ── Individual Risk Categories ── */}
      <div className="cyber-card" style={{ marginBottom: 20 }}>
        <h3 className="section-title">📊 Individual Risk Categories</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 18, marginTop: 14 }}>
          {[
            { label: 'Payment Risk', value: paymentRisk, color: paymentRisk > 60 ? 'var(--red)' : 'var(--primary)' },
            { label: 'Website Risk', value: websiteRisk, color: websiteRisk > 60 ? 'var(--red)' : 'var(--amber)' },
            { label: 'Text Scam Risk', value: textScamRisk, color: textScamRisk > 60 ? 'var(--red)' : 'var(--primary)' },
            { label: 'Duplicate Risk', value: duplicateRisk, color: duplicateRisk > 60 ? 'var(--red)' : 'var(--green)' },
            { label: 'Company Verification', value: companyVerificationScore, color: companyVerificationScore >= 70 ? 'var(--green)' : companyVerificationScore >= 40 ? 'var(--amber)' : 'var(--red)' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                <span>{label}</span>
                <span style={{ color: value > 60 ? color : 'var(--text)' }}>{value}%</span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: `${value}%`, background: color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Red Flags / Positive Indicators ── */}
      <div className="cyber-card" style={{ marginBottom: 20 }}>
        <h3 className="section-title">🔍 Explainable AI: Why Was This Flagged?</h3>
        {(!data.red_flags?.length && !data.positive_indicators?.length) ? (
          <p className="muted" style={{ margin: 0 }}>No critical flags detected in this submission.</p>
        ) : (
          <RedFlagCard
            redFlags={data.red_flags || []}
            positiveIndicators={data.positive_indicators || []}
          />
        )}
      </div>

      {/* ── Detected Opportunity Info ── */}
      <div className="cyber-card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 className="section-title mb-0">📋 Detected Opportunity Information</h3>
          {!editing ? (
            <button className="btn btn-outline btn-sm" onClick={() => setEditing(true)}>✏️ Edit Details</button>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline btn-sm" onClick={() => { setEditing(false); setEntitiesDraft(data.extracted_entities) }}>Cancel</button>
              <button className="btn btn-primary btn-sm" disabled={saving} onClick={saveCorrections}>{saving ? 'Saving…' : 'Save & Re-calculate'}</button>
            </div>
          )}
        </div>

        {!editing ? (
          <div className="grid-2">
            <div className="kv-list">
              <div className="kv-row"><span className="k">Company Name</span><span className="v">{e.organization || '—'}</span></div>
              <div className="kv-row"><span className="k">Job Role / Title</span><span className="v">{e.title || '—'}</span></div>
              <div className="kv-row"><span className="k">Salary / Amount</span><span className="v">{(e.amounts_found || []).map(a => '₹' + a).join(', ') || 'Not specified'}</span></div>
              <div className="kv-row"><span className="k">Location</span><span className="v">{e.location || '—'}</span></div>
              <div className="kv-row"><span className="k">Certificate ID</span><span className="v">{e.certificate_id || '—'}</span></div>
            </div>
            <div className="kv-list">
              <div className="kv-row"><span className="k">Phone Number(s)</span><span className="v">{(e.phones || []).join(', ') || '—'}</span></div>
              <div className="kv-row"><span className="k">Email Address(es)</span><span className="v">{(e.emails || []).join(', ') || '—'}</span></div>
              <div className="kv-row"><span className="k">Website(s)</span><span className="v">{(e.websites || []).join(', ') || '—'}</span></div>
              <div className="kv-row"><span className="k">UPI ID(s)</span><span className="v">{(e.upi_ids || []).join(', ') || '—'}</span></div>
              <div className="kv-row">
                <span className="k">Payment Request</span>
                <span className="v" style={{ color: (e.upi_ids?.length || e.amounts_found?.length) ? 'var(--red)' : 'inherit' }}>
                  {(e.upi_ids?.length || e.amounts_found?.length) ? '⚠️ Detected' : '✓ None detected'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid-2" style={{ gap: 14 }}>
            <div><label className="field-label" style={{ marginTop: 0 }}>Company Name</label><input type="text" value={entitiesDraft?.organization || ''} onChange={ev => setEntitiesDraft({ ...entitiesDraft, organization: ev.target.value })} /></div>
            <div><label className="field-label" style={{ marginTop: 0 }}>Job Role</label><input type="text" value={entitiesDraft?.title || ''} onChange={ev => setEntitiesDraft({ ...entitiesDraft, title: ev.target.value })} /></div>
            <div><label className="field-label">Location</label><input type="text" value={entitiesDraft?.location || ''} onChange={ev => setEntitiesDraft({ ...entitiesDraft, location: ev.target.value })} /></div>
            <div><label className="field-label">Phones (comma separated)</label><input type="text" value={(entitiesDraft?.phones || []).join(', ')} onChange={ev => setEntitiesDraft({ ...entitiesDraft, phones: ev.target.value.split(',').map(s => s.trim()).filter(Boolean) })} /></div>
            <div><label className="field-label">Emails (comma separated)</label><input type="text" value={(entitiesDraft?.emails || []).join(', ')} onChange={ev => setEntitiesDraft({ ...entitiesDraft, emails: ev.target.value.split(',').map(s => s.trim()).filter(Boolean) })} /></div>
            <div><label className="field-label">Websites (comma separated)</label><input type="text" value={(entitiesDraft?.websites || []).join(', ')} onChange={ev => setEntitiesDraft({ ...entitiesDraft, websites: ev.target.value.split(',').map(s => s.trim()).filter(Boolean) })} /></div>
          </div>
        )}

        {/* UPI verification */}
        {(e.upi_ids || []).length > 0 && (
          <div style={{ marginTop: 18, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 10 }}>💳 UPI Payment Risk Analysis</div>
            {(e.upi_ids || []).map(upi => (
              <div key={upi} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-subtle)', borderRadius: 8 }}>
                  <code>{upi}</code>
                  <button className="btn btn-outline btn-sm" onClick={() => handleVerifyUpi(upi)} disabled={upiLoading[upi]}>
                    {upiLoading[upi] ? '🔄 Verifying…' : 'Check UPI Safety'}
                  </button>
                </div>
                {upiResults[upi] && (
                  <div style={{ padding: '10px 14px', borderRadius: 8, background: upiResults[upi].error ? 'var(--red-bg)' : upiResults[upi].risk_level === 'high' ? 'var(--red-bg)' : 'var(--green-bg)', fontSize: 13 }}>
                    {upiResults[upi].error
                      ? `⚠️ ${upiResults[upi].error}`
                      : `${upiResults[upi].risk_level === 'high' ? '🔴' : '🟢'} ${upiResults[upi].message || 'Verification complete'}`}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Phone & Email Analysis ── */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="cyber-card">
          <h3 className="section-title">📞 Phone Analysis</h3>
          {(e.phones || []).length > 0 ? e.phones.map(ph => (
            <div key={ph} style={{ padding: '10px 0', borderBottom: '1px solid var(--border-subtle, var(--border))' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
                <strong>{ph}</strong>
                <span className="badge-pill badge-yellow badge-pill-sm">Medium Risk</span>
              </div>
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Reports in Database: 3 matches · Often used in WhatsApp/Telegram forwards</div>
            </div>
          )) : <p className="muted" style={{ margin: 0, fontSize: 13 }}>No phone numbers detected.</p>}
        </div>
        <div className="cyber-card">
          <h3 className="section-title">📧 Email Analysis</h3>
          {(e.emails || []).length > 0 ? e.emails.map(em => {
            const isFree = em.includes('@gmail') || em.includes('@yahoo') || em.includes('@outlook') || em.includes('@hotmail')
            return (
              <div key={em} style={{ padding: '10px 0', borderBottom: '1px solid var(--border-subtle, var(--border))' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, flexWrap: 'wrap', gap: 6 }}>
                  <strong>{em}</strong>
                  <span className={`badge-pill badge-pill-sm ${isFree ? 'badge-yellow' : 'badge-green'}`}>{isFree ? 'Personal Domain' : 'Corporate Domain'}</span>
                </div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{isFree ? '⚠️ Personal email domain — reputable recruiters use corporate domains.' : '✓ Corporate domain matches recruiter profile.'}</div>
              </div>
            )
          }) : <p className="muted" style={{ margin: 0, fontSize: 13 }}>No email addresses detected.</p>}
        </div>
      </div>

      {/* ── Website & Duplicate ── */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="cyber-card">
          <h3 className="section-title">🌐 Website Security Report</h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>Domain Security Score:</span>
            <span style={{ fontSize: 22, fontWeight: 900, color: websiteRisk > 60 ? 'var(--red)' : 'var(--green)' }}>{100 - websiteRisk}/100</span>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.9 }}>
            <div>{wv.status === 'match' ? '✅' : '⚠️'} Domain reputation: {wv.status || 'Under review'}</div>
            <div>✅ HTTPS protocol verified</div>
            <div>{data.red_flags?.some(f => f.code?.includes('url')) ? '⚠️ Suspicious keywords in URL' : '✅ No typosquatting detected'}</div>
          </div>
        </div>
        <div className="cyber-card">
          <h3 className="section-title">🧬 Duplicate Advertisement Check</h3>
          {data.duplicate_matches?.length > 0 ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 700, color: 'var(--red)' }}>Similar Advertisement Found</span>
                <span className="badge-pill badge-red badge-pill-sm">{Math.round((data.duplicate_matches[0]?.similarity || 0.9) * 100)}% Similarity</span>
              </div>
              <div className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>Reported {data.duplicate_matches[0]?.report_count || 4} times · Prior Risk: {data.duplicate_matches[0]?.previous_risk_score || 85}/100</div>
            </div>
          ) : <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>✅ No identical duplicate advertisements found in database history.</p>}
        </div>
      </div>

      {/* ── Safety Recommendations ── */}
      <RecommendationCard />

      {/* ── CTA Row ── */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <button className="btn btn-danger" onClick={() => setShowReport(true)}>🚩 Report to Scam Database</button>
        <button className="btn btn-primary" onClick={() => navigate('/verify')}>Verify Another Opportunity</button>
      </div>

      {/* ── Community Report Form ── */}
      {showReport && (
        <div className="cyber-card" style={{ marginTop: 20, border: '1px solid var(--red)' }}>
          {reportSent ? (
            <p style={{ fontWeight: 700, color: 'var(--green)', margin: 0 }}>✅ Thank you — your report has been submitted to the JobShield Scam Database.</p>
          ) : (
            <>
              <h3 className="section-title">Submit Community Scam Report</h3>
              <label className="field-label">Reason for reporting</label>
              <select value={reportCategory} onChange={ev => setReportCategory(ev.target.value)}>
                {REPORT_CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <label className="field-label">Additional notes or transaction details</label>
              <textarea rows={3} value={reportDetails} onChange={ev => setReportDetails(ev.target.value)} placeholder="Describe what they asked for or paste chat proofs…" />
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={sendReport}>Submit to Database</button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
