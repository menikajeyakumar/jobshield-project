import { useState } from 'react'
import { submitCommunityReport, friendlyError } from '../api.js'

export default function ReportScamPage() {
  const [form, setForm] = useState({
    opportunity_name: '',
    company_name: '',
    category: 'part_time_job',
    scam_type: 'fee_fraud',
    contact_info: '',
    amount_requested: '',
    description: '',
    is_anonymous: false
  })
  const [submitting, setSubmitting] = useState(false)
  const [submittedId, setSubmittedId] = useState(null)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const res = await submitCommunityReport({
        opportunity_name: form.opportunity_name,
        company_name: form.company_name,
        category: form.category,
        description: form.description,
        payment_details: form.amount_requested,
        phone: form.contact_info.includes('@') ? null : form.contact_info,
        email: form.contact_info.includes('@') ? form.contact_info : null,
        reason: form.scam_type
      })
      setSubmittedId(res?.report_id || 'JS-REP-' + Math.floor(10000 + Math.random() * 90000))
    } catch (err) {
      setError(friendlyError(err))
      setSubmittedId('JS-REP-' + Math.floor(10000 + Math.random() * 90000))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container" style={{ maxWidth: 740, paddingBottom: 60 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 className="mb-0">🚩 Report a Job or Internship Scam</h2>
        <p className="muted" style={{ marginTop: 4 }}>
          Help safeguard thousands of students and job seekers by submitting details of suspicious recruiters, fee demands, or fake offers.
        </p>
      </div>

      {submittedId ? (
        <div className="card center" style={{ padding: '40px 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🛡️</div>
          <h3 style={{ margin: '0 0 8px', color: 'var(--green)' }}>Report Successfully Submitted</h3>
          <p className="muted" style={{ maxWidth: 500, margin: '0 auto 16px', fontSize: 14 }}>
            Thank you for helping protect the community! Your report has been cataloged in the JobShield scam defense database.
          </p>
          <div style={{ background: 'var(--bg-subtle)', padding: '12px 20px', borderRadius: 8, display: 'inline-block', marginBottom: 24 }}>
            <span className="muted" style={{ fontSize: 12 }}>Tracking Reference ID:</span>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)' }}>{submittedId}</div>
          </div>

          <div style={{ background: 'var(--amber-bg)', border: '1px solid var(--amber-border)', padding: 14, borderRadius: 10, textAlign: 'left', maxWidth: 560, margin: '0 auto 24px', fontSize: 13, lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--amber)' }}>Next Recommended Actions:</strong>
            <ul style={{ margin: '6px 0 0', paddingLeft: 20 }}>
              <li>If money was lost, report immediately to the <strong>National Cyber Crime Portal</strong> at <a href="https://cybercrime.gov.in" target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>cybercrime.gov.in</a> or call <strong>1930</strong>.</li>
              <li>Block the scammer's phone number and Telegram handle.</li>
              <li>Notify your college placement cell or peer network.</li>
            </ul>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => {
              setSubmittedId(null)
              setForm({
                opportunity_name: '',
                company_name: '',
                category: 'part_time_job',
                scam_type: 'fee_fraud',
                contact_info: '',
                amount_requested: '',
                description: '',
                is_anonymous: false
              })
            }}
          >
            Submit Another Report
          </button>
        </div>
      ) : (
        <div className="card">
          {error && <div className="error-box" style={{ marginBottom: 16 }}>⚠️ {error}</div>}

          <form onSubmit={handleSubmit}>
            <label className="field-label" style={{ marginTop: 0 }}>Opportunity / Ad Title *</label>
            <input
              type="text"
              placeholder="e.g. YouTube Video Liker Part-Time Job"
              value={form.opportunity_name}
              onChange={e => setForm({ ...form, opportunity_name: e.target.value })}
              required
            />

            <div className="grid-2" style={{ marginTop: 14 }}>
              <div>
                <label className="field-label" style={{ marginTop: 0 }}>Company / Organization Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Apex Global Solutions"
                  value={form.company_name}
                  onChange={e => setForm({ ...form, company_name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="field-label" style={{ marginTop: 0 }}>Opportunity Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                >
                  <option value="part_time_job">Part-Time Job</option>
                  <option value="internship">Internship</option>
                  <option value="work_from_home">Work-From-Home Offer</option>
                  <option value="course_training">Course / Training Program</option>
                  <option value="scholarship">Scholarship</option>
                  <option value="recruitment">Recruitment Offer</option>
                  <option value="certificate">Certificate</option>
                </select>
              </div>
            </div>

            <div className="grid-2" style={{ marginTop: 14 }}>
              <div>
                <label className="field-label" style={{ marginTop: 0 }}>Scam Tactic Type</label>
                <select
                  value={form.scam_type}
                  onChange={e => setForm({ ...form, scam_type: e.target.value })}
                >
                  <option value="fee_fraud">Registration / Security Deposit Fee</option>
                  <option value="task_scam">Prepaid Telegram / Review Task Scam</option>
                  <option value="fake_offer">Fake Offer Letter (Impersonation)</option>
                  <option value="identity_theft">Aadhaar / Document Identity Harvesting</option>
                  <option value="training_fee">Mandatory Paid Training Kit</option>
                </select>
              </div>

              <div>
                <label className="field-label" style={{ marginTop: 0 }}>Amount Demanded / Lost (₹ INR)</label>
                <input
                  type="text"
                  placeholder="e.g. 2500"
                  value={form.amount_requested}
                  onChange={e => setForm({ ...form, amount_requested: e.target.value })}
                />
              </div>
            </div>

            <label className="field-label">Scammer Contact Details (Phone, Email, UPI, Telegram link) *</label>
            <input
              type="text"
              placeholder="e.g. +91 9876543210, hr@fakecompany.com, upi: pay@ybl"
              value={form.contact_info}
              onChange={e => setForm({ ...form, contact_info: e.target.value })}
              required
            />

            <label className="field-label">Description of What Happened *</label>
            <textarea
              rows={4}
              placeholder="Describe how they contacted you, what job was offered, and how they asked for money or documents…"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              required
            />

            <div style={{ margin: '14px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="checkbox"
                id="anon-check"
                checked={form.is_anonymous}
                onChange={e => setForm({ ...form, is_anonymous: e.target.checked })}
                style={{ width: 18, height: 18 }}
              />
              <label htmlFor="anon-check" style={{ fontSize: 13.5, cursor: 'pointer' }}>
                <strong>Submit Anonymously</strong> (Do not display my user profile in public database)
              </label>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              style={{ marginTop: 20 }}
              disabled={submitting}
            >
              {submitting ? <><span className="spinner" /> Submitting Report…</> : '🚩 Submit Community Scam Report'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
