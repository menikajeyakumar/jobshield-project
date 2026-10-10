import { useState, useRef, useEffect } from 'react'

const SAMPLE_SCAM = `Urgent Hiring Notice: Part-Time Work From Home Job Opportunity!
Earn Rs.2500 - Rs.5000 per day by completing simple online data entry tasks.
Mandatory Non-Refundable Security Deposit & Registration Fee of Rs.999 required before joining.
Advance payment required to book your seat. 100% guaranteed job without interview.
Send your Aadhaar card copy, PAN card details, and Bank Passbook photo via WhatsApp: +91 9876543210.
Pay immediately via UPI ID: fakejobrecruitment@paytm. Contact on Telegram @scamjobhr.`

const SAMPLE_LEGIT = `Senior Frontend Engineer at Zoho Corporation
Location: Chennai / Remote
We are seeking an experienced Frontend Developer with 3+ years in React, TypeScript, and modern web architectures.
Requirements: Bachelor's degree in Computer Science or equivalent. Solid understanding of browser APIs and state management.
To apply, please submit your resume through our official careers portal at careers.zoho.com or email hr@zoho.com.
Zoho will never ask for registration fees or payment at any stage of recruitment.`

export default function ScanUploader({ onSubmit, loading, error }) {
  const [mode, setMode] = useState('text')
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [categoryHint, setCategoryHint] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    if (file.type?.startsWith('image/')) {
      const u = URL.createObjectURL(file)
      setPreviewUrl(u)
      return () => URL.revokeObjectURL(u)
    }
  }, [file])

  function handleFormSubmit(e) {
    e.preventDefault()
    onSubmit({ mode, text, url, file, categoryHint })
  }

  function onDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) setFile(f)
  }

  return (
    <div className="cyber-card animate-fade-in">
      <div className="input-mode-cards" style={{ marginBottom: 20 }}>
        <div className={`mode-card ${mode === 'upload' ? 'selected' : ''}`} onClick={() => setMode('upload')}>
          <div style={{ fontSize: 30, marginBottom: 6 }}>📷</div>
          <div style={{ fontWeight: 800, fontSize: 14 }}>Upload</div>
          <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>Poster, screenshot, PDF</div>
        </div>

        <div className={`mode-card ${mode === 'text' ? 'selected' : ''}`} onClick={() => setMode('text')}>
          <div style={{ fontSize: 30, marginBottom: 6 }}>📝</div>
          <div style={{ fontWeight: 800, fontSize: 14 }}>Paste Text</div>
          <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>Offer letter, message</div>
        </div>

        <div className={`mode-card ${mode === 'url' ? 'selected' : ''}`} onClick={() => setMode('url')}>
          <div style={{ fontSize: 30, marginBottom: 6 }}>🔗</div>
          <div style={{ fontWeight: 800, fontSize: 14 }}>Paste URL</div>
          <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>Application link</div>
        </div>
        {/* WhatsApp Screenshot Scan */}
        <div className={`mode-card ${mode === 'whatsapp' ? 'selected' : ''}`} onClick={() => setMode('whatsapp')}>
          <div style={{ fontSize: 30, marginBottom: 6 }}>📱</div>
          <div style={{ fontWeight: 800, fontSize: 14 }}>WhatsApp</div>
          <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>Screenshot upload</div>
        </div>
        {/* QR Code Scan */}
        <div className={`mode-card ${mode === 'qr' ? 'selected' : ''}`} onClick={() => setMode('qr')}>
          <div style={{ fontSize: 30, marginBottom: 6 }}>🔳</div>
          <div style={{ fontWeight: 800, fontSize: 14 }}>QR Code</div>
          <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>Image with QR</div>
        </div>
      </div>

      <form onSubmit={handleFormSubmit}>
        {['upload', 'whatsapp', 'qr'].includes(mode) && (
          <div
            className={`dropzone ${dragOver ? 'dragover' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            {file ? (
              <div>
                <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{file.name}</div>
                <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
                  {(file.size / 1024).toFixed(1)} KB · Click to change file
                </div>
                {previewUrl && (
                  <div style={{ marginTop: 14 }}>
                    <img src={previewUrl} alt="Preview" style={{ maxHeight: 180, maxWidth: '100%', borderRadius: 8 }} />
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 38, marginBottom: 8 }}>
                  {mode === 'whatsapp' ? '📱' : mode === 'qr' ? '🔳' : '📥'}
                </div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  {mode === 'whatsapp'
                    ? 'Drop WhatsApp job offer screenshot here'
                    : mode === 'qr'
                    ? 'Drop poster or certificate with QR code here'
                    : 'Drop poster, screenshot, certificate or PDF here'}
                </div>
                <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
                  Supports JPG, PNG, WEBP and PDF up to 8MB
                </div>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".jpg,.jpeg,.png,.webp,.pdf,image/*,application/pdf"
              onChange={e => setFile(e.target.files?.[0] || null)}
            />
          </div>
        )}

        {mode === 'text' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label className="field-label" style={{ margin: 0 }}>Opportunity Content / Message</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" className="btn btn-outline btn-sm" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => setText(SAMPLE_SCAM)}>
                  ⚡ Scam Sample
                </button>
                <button type="button" className="btn btn-outline btn-sm" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => setText(SAMPLE_LEGIT)}>
                  ✓ Legit Sample
                </button>
              </div>
            </div>
            <textarea
              rows={8}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Paste job description, recruitment WhatsApp forward, internship offer letter text, or payment demands here…"
            />
          </div>
        )}

        {mode === 'url' && (
          <div>
            <label className="field-label" style={{ marginTop: 0 }}>Opportunity Application / Website URL</label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://company-careers-example.com/apply"
            />
          </div>
        )}

        {error && <div className="error-box" style={{ marginTop: 14 }}>⚠️ {error}</div>}

        <button type="submit" className="btn btn-primary btn-block btn-lg" style={{ marginTop: 20 }} disabled={loading}>
          🛡️ Analyze with JobShield AI
        </button>
      </form>
    </div>
  )
}
