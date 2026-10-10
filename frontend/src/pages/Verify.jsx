import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { analyzeText, analyzeUrl, analyzeUpload, friendlyError } from '../api.js'
import ScanUploader from '../components/ScanUploader.jsx'
import LoadingScanner from '../components/LoadingScanner.jsx'

export default function Verify() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [error, setError] = useState(null)
  const stepTimerRef = useRef(null)

  function startProgress() {
    setStepIndex(0)
    let i = 0
    stepTimerRef.current = setInterval(() => {
      i = Math.min(i + 1, 4)
      setStepIndex(i)
    }, 450)
  }

  function stopProgress() {
    clearInterval(stepTimerRef.current)
  }

  async function handleScanSubmit({ mode, text, url, file, categoryHint }) {
    // Validation per mode
    if (mode === 'upload' && !file) {
      setError('Please choose or drag a file to upload.')
      return
    }
    if (mode === 'whatsapp' && !file) {
      setError('Please upload a WhatsApp screenshot.')
      return
    }
    if (mode === 'qr' && !file) {
      setError('Please upload an image containing a QR code.')
      return
    }
    if (mode === 'text' && (!text || text.trim().length < 5)) {
      setError('Please enter or paste at least a few words of text.')
      return
    }
    if (mode === 'url' && (!url || url.trim().length < 4)) {
      setError('Please enter a valid website or opportunity URL.')
      return
    }

    setError(null)
    setLoading(true)
    startProgress()

    try {
      let result
      if (['upload', 'whatsapp', 'qr'].includes(mode)) {
        result = await analyzeUpload(file, categoryHint || undefined)
      } else if (mode === 'text') {
        result = await analyzeText(text, categoryHint || undefined)
      } else {
        result = await analyzeUrl(url, categoryHint || undefined)
      }

      setStepIndex(4)
      setTimeout(() => navigate(`/result/${result.id}`), 450)
    } catch (err) {
      setError(friendlyError(err))
      setLoading(false)
      stopProgress()
    }
  }

  if (loading) {
    return <LoadingScanner stepIndex={stepIndex} />
  }

  return (
    <div className="container" style={{ maxWidth: 780, paddingBottom: 60 }}>
      <div className="center" style={{ marginBottom: 24 }}>
        <span className="badge-pill badge-blue badge-pill-sm" style={{ marginBottom: 8 }}>
          AI OPPORTUNITY SCANNER
        </span>
        <h2 style={{ fontSize: 32, margin: '6px 0 8px', letterSpacing: '-0.5px' }}>
          Verify an Opportunity
        </h2>
        <p className="muted" style={{ fontSize: 14.5, maxWidth: 540, margin: '0 auto' }}>
          Upload a poster/PDF, paste message text, or enter an application URL to evaluate fraud risk.
        </p>
      </div>

      <ScanUploader onSubmit={handleScanSubmit} loading={loading} error={error} />

      <div className="center muted" style={{ fontSize: 12.5, marginTop: 18 }}>
        🔒 Privacy Assurance: JobShield AI processes submission text for security evaluation only. Never share passwords or banking OTPs.
      </div>
    </div>
  )
}
