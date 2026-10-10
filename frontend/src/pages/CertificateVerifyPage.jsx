import { useState } from 'react'
import { verifyCertificate, friendlyError } from '../api.js'

export default function CertificateVerifyPage() {
  const [certMode, setCertMode] = useState('upload') // 'upload' or 'id'
  const [certId, setCertId] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const TEST_CERTS = [
    { label: '🔴 Test Fake Certificate ID', id: 'FAKE-INTERN-2024-9981' },
    { label: '🟢 Test Authentic Microsoft Cert', id: 'MSFT-AI-2024-88421' },
    { label: '🟠 Test Tampered Internship Cert', id: 'TAMPERED-CERT-4412' }
  ]

  async function handleVerify(testId) {
    const activeId = testId || certId
    if (certMode === 'id' && !activeId.trim()) return
    if (certMode === 'upload' && !file && !testId) return

    setLoading(true)
    setResult(null)
    setError(null)

    try {
      const data = await verifyCertificate(activeId || undefined, certMode === 'upload' ? file : undefined)
      setResult(data)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container" style={{ paddingBottom: 60 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 className="mb-0">📄 Certificate &amp; Credential Verification</h2>
        <p className="muted" style={{ marginTop: 4 }}>
          Verify the authenticity of internship certificates, course completion letters, and training credentials against tampering and forgery.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
          <button
            className={`btn ${certMode === 'upload' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => { setCertMode('upload'); setResult(null); setError(null); }}
          >
            📤 Upload Certificate Document
          </button>
          <button
            className={`btn ${certMode === 'id' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => { setCertMode('id'); setResult(null); setError(null); }}
          >
            🔢 Verify by Certificate ID
          </button>
        </div>

        {certMode === 'upload' ? (
          <div>
            <label className="field-label" style={{ marginTop: 0 }}>Certificate Image (PNG, JPG) or PDF Document</label>
            <div
              style={{
                border: '2px dashed var(--border)',
                borderRadius: 'var(--radius)',
                padding: '30px 20px',
                textAlign: 'center',
                background: 'var(--bg-subtle)',
                cursor: 'pointer'
              }}
              onClick={() => document.getElementById('cert-file-input').click()}
            >
              <input
                id="cert-file-input"
                type="file"
                accept="image/*,application/pdf"
                style={{ display: 'none' }}
                onChange={e => setFile(e.target.files[0])}
              />
              <div style={{ fontSize: 36, marginBottom: 10 }}>📄</div>
              {file ? (
                <div>
                  <strong style={{ color: 'var(--primary)' }}>{file.name}</strong>
                  <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                    {(file.size / 1024).toFixed(1)} KB · Click to change file
                  </div>
                </div>
              ) : (
                <div>
                  <strong style={{ fontSize: 15 }}>Click or Drag &amp; Drop Certificate here</strong>
                  <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                    Supports PNG, JPG, and PDF certificates up to 10MB
                  </div>
                </div>
              )}
            </div>

            <button
              className="btn btn-primary"
              style={{ marginTop: 18 }}
              disabled={!file || loading}
              onClick={() => handleVerify()}
            >
              {loading ? <><span className="spinner" /> Analyzing Certificate…</> : '🔍 Run Forensic Verification'}
            </button>
          </div>
        ) : (
          <div>
            <label className="field-label" style={{ marginTop: 0 }}>Certificate ID / Verification Number</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="e.g. CERT-2024-AI-8942 or MSFT-AI-2024-88421"
                value={certId}
                onChange={e => setCertId(e.target.value)}
                style={{ flex: 1, minWidth: 260 }}
              />
              <button
                className="btn btn-primary"
                disabled={!certId.trim() || loading}
                onClick={() => handleVerify()}
              >
                {loading ? <><span className="spinner" /> Verifying…</> : '🔍 Verify Certificate ID'}
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 16, flexWrap: 'wrap' }}>
          <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>Quick Test Samples:</span>
          {TEST_CERTS.map(t => (
            <button
              key={t.id}
              className="btn btn-outline btn-sm"
              style={{ fontSize: 12, padding: '4px 10px' }}
              onClick={() => {
                setCertMode('id');
                setCertId(t.id);
                handleVerify(t.id);
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="error-box" style={{ marginBottom: 16 }}>⚠️ {error}</div>}

      {loading && (
        <div className="card center" style={{ padding: '40px 20px' }}>
          <div className="spinner" style={{ width: 32, height: 32, marginBottom: 12 }} />
          <h4 style={{ margin: '0 0 6px' }}>Performing Certificate Forensic Analysis</h4>
          <p className="muted" style={{ fontSize: 13, margin: 0 }}>
            Scanning cryptographic watermarks, QR verification payloads, and issuer databases…
          </p>
        </div>
      )}

      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="cert-badge-box">
            <div className="cert-seal">
              {result.status === 'authentic' ? '🛡️' : result.status === 'suspicious' ? '⚠️' : '❌'}
            </div>
            <span
              className={`badge badge-${result.badge_color || 'green'}`}
              style={{ fontSize: 13, padding: '6px 16px', letterSpacing: 0.5, fontWeight: 800 }}
            >
              {(result.status_label || result.status).toUpperCase()}
            </span>

            <h2 style={{ fontSize: 24, margin: '14px 0 6px' }}>{result.course}</h2>
            <p className="muted" style={{ margin: '0 0 18px', fontSize: 14 }}>
              Issued by: <strong>{result.issuer}</strong> · Recipient: <strong>{result.recipient}</strong>
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap', fontSize: 13, borderTop: '1px solid var(--border)', paddingTop: 16, maxWidth: 600, margin: '0 auto' }}>
              <div><span className="muted">Certificate ID:</span> <strong>{result.cert_id}</strong></div>
              <div><span className="muted">Issue Date:</span> <strong>{result.issue_date}</strong></div>
              <div><span className="muted">AI Confidence:</span> <strong>{result.confidence}%</strong></div>
            </div>

            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 10 }}>
              <button className="btn btn-outline btn-sm btn-no-print" onClick={() => window.print()}>
                🖨️ Print Verification Badge
              </button>
              <button
                className="btn btn-primary btn-sm btn-no-print"
                onClick={() => {
                  navigator.clipboard?.writeText(window.location.href);
                  alert('Verification link copied to clipboard!');
                }}
              >
                🔗 Share Verification
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="section-title">Forensic Audit Breakdown</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {result.checks.map((chk, i) => (
                <div key={i} className="check-step-item">
                  <span style={{ fontSize: 20 }}>{chk.passed ? '✅' : '❌'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{chk.title}</div>
                    <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>{chk.detail}</div>
                  </div>
                  <span className={`badge badge-${chk.passed ? 'green' : 'red'}`} style={{ fontSize: 11 }}>
                    {chk.passed ? 'VERIFIED' : 'FLAGGED'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
