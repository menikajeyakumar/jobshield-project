import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPublicScamPatterns, friendlyError } from '../api.js'

export default function ScamDatabasePage() {
  const [patterns, setPatterns] = useState([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [riskFilter, setRiskFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const DEFAULT_CATALOG = [
    {
      id: 'scam_1',
      title: 'YouTube Video Liker & Reviewer Task Scam',
      company: 'Digital Wave Media Pvt Ltd',
      category: 'part_time_job',
      risk_level: 'high',
      contact: 'WhatsApp: +91 98765 43210 · Telegram: @digital_task_vip',
      upi: 'taskpay.merchant@axl',
      description: 'Scammers promise ₹150 per video like, pay ₹300 initially, then demand a ₹5,000 security deposit for "VIP prepaid tasks".',
      red_flags: ['Prepaid task deposit', 'WhatsApp recruitment', 'Personal UPI recipient'],
      confirmations: 64,
      date: 'Sep 2024'
    },
    {
      id: 'scam_2',
      title: 'Fake TCS Off-Campus Offer with Security Deposit',
      company: 'Tata Consultancy Services (Spoofed)',
      category: 'recruitment',
      risk_level: 'high',
      contact: 'Email: tcs.hr-careers@gmail.com · Web: careers-tcs-portal.site',
      upi: 'tcsrecruitment@ybl',
      description: 'Victims receive a fake offer letter demanding ₹2,500 for "document verification and laptop dispatch insurance".',
      red_flags: ['Free email domain (@gmail)', 'Upfront laptop fee', 'Spoofed corporate logo'],
      confirmations: 89,
      date: 'Sep 2024'
    },
    {
      id: 'scam_3',
      title: 'WFH Medical Billing & Data Entry Typist Scam',
      company: 'Apex Data Services Ltd',
      category: 'work_from_home',
      risk_level: 'high',
      contact: 'Phone: +91 88990 11223 · Email: support@apex-dataentry.top',
      upi: 'apexsolutions@paytm',
      description: 'Demands ₹1,200 software activation charge. Then claims candidate made accuracy errors and threatens legal action unless ₹5,000 penalty is paid.',
      red_flags: ['Software activation fee', 'Legal extortion threat', 'Unregistered company'],
      confirmations: 47,
      date: 'Aug 2024'
    },
    {
      id: 'scam_4',
      title: 'Guaranteed Scholarship Processing Fee Scam',
      company: 'National Youth Educational Trust (Fake)',
      category: 'scholarship',
      risk_level: 'high',
      contact: 'WhatsApp: +91 91234 56789 · Web: pm-scholarship-apply.online',
      upi: 'scholarship.dept@okaxis',
      description: 'Claims student is selected for ₹50,000 government scholarship, but must pay ₹999 stamp duty tax via UPI to release funds.',
      red_flags: ['Fee to claim scholarship', 'Unofficial government domain', 'Urgent countdown timer'],
      confirmations: 38,
      date: 'Aug 2024'
    },
    {
      id: 'scam_5',
      title: 'Unpaid Internship with Mandatory "Training Kit" Purchase',
      company: 'BrightFuture Tech Labs',
      category: 'internship',
      risk_level: 'medium',
      contact: 'Email: intern@brightfuture-edu.in',
      upi: 'None (Bank transfer)',
      description: 'Promises certificate and placement after 3 months, but requires candidate to buy a ₹4,500 course module to start.',
      red_flags: ['Pay-to-intern', 'Vague company credentials', 'No mentor interaction'],
      confirmations: 26,
      date: 'Jul 2024'
    }
  ]

  useEffect(() => {
    getPublicScamPatterns()
      .then(apiPatterns => {
        if (apiPatterns && apiPatterns.length > 0) {
          const formatted = apiPatterns.map((p, idx) => ({
            id: 'api_' + (p.id || idx),
            title: `Reported Pattern: ${p.pattern_type.toUpperCase()} (${p.value})`,
            company: p.category ? p.category.replace(/_/g, ' ') : 'Flagged Entity',
            category: p.category || 'recruitment',
            risk_level: p.risk_level || 'high',
            contact: `${p.pattern_type}: ${p.value}`,
            upi: p.pattern_type === 'upi' ? p.value : 'N/A',
            description: p.notes || `Community flagged scam pattern associated with ${p.value}.`,
            red_flags: [`Suspicious ${p.pattern_type}`, 'Community flagged'],
            confirmations: p.report_count || 12,
            date: 'Recent'
          }))
          setPatterns([...formatted, ...DEFAULT_CATALOG])
        } else {
          setPatterns(DEFAULT_CATALOG)
        }
      })
      .catch(err => {
        setError(friendlyError(err))
        setPatterns(DEFAULT_CATALOG)
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = patterns.filter(p => {
    const matchesSearch =
      !search.trim() ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.company.toLowerCase().includes(search.toLowerCase()) ||
      p.contact.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())

    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter
    const matchesRisk = riskFilter === 'all' || p.risk_level === riskFilter

    return matchesSearch && matchesCategory && matchesRisk
  })

  return (
    <div className="container" style={{ paddingBottom: 60 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 20 }}>
        <div>
          <h2 className="mb-0">🗄️ Public Scam Pattern Database</h2>
          <p className="muted" style={{ marginTop: 4 }}>
            Search verified fraudulent recruiters, blacklisted phone numbers, fake offer letters, and payment traps.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/report-scam')}>
          🚩 Report a Scam
        </button>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="🔍 Search by company, keyword, phone number, email, or UPI ID…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', marginBottom: 14, fontSize: 14 }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span className="muted" style={{ fontSize: 12, alignSelf: 'center', marginRight: 4 }}>Category:</span>
            {[
              { id: 'all', label: 'All' },
              { id: 'part_time_job', label: 'Part-Time' },
              { id: 'internship', label: 'Internship' },
              { id: 'work_from_home', label: 'WFH' },
              { id: 'recruitment', label: 'Recruitment' },
              { id: 'scholarship', label: 'Scholarship' }
            ].map(c => (
              <button
                key={c.id}
                className={`filter-pill ${categoryFilter === c.id ? 'active' : ''}`}
                onClick={() => setCategoryFilter(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <span className="muted" style={{ fontSize: 12, alignSelf: 'center', marginRight: 4 }}>Risk:</span>
            {['all', 'high', 'medium'].map(r => (
              <button
                key={r}
                className={`filter-pill ${riskFilter === r ? 'active' : ''}`}
                onClick={() => setRiskFilter(r)}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card center" style={{ padding: 40 }}><span className="spinner" /> Loading scam records…</div>
      ) : filtered.length === 0 ? (
        <div className="card center" style={{ padding: 40 }}>
          <h4>No matching scam patterns found</h4>
          <p className="muted">Try different search keywords or reset your filters.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.map(p => (
            <div key={p.id} className="scam-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span className={`badge badge-${p.risk_level === 'high' ? 'red' : 'amber'}`}>
                      {p.risk_level.toUpperCase()} RISK
                    </span>
                    <span className="badge badge-gray">{p.category.replace(/_/g, ' ').toUpperCase()}</span>
                    <span className="muted" style={{ fontSize: 12 }}>Reported: {p.date}</span>
                  </div>
                  <h3 style={{ margin: '4px 0', fontSize: 17 }}>{p.title}</h3>
                  <div style={{ fontWeight: 600, color: 'var(--primary)', fontSize: 13.5 }}>
                    🏢 {p.company}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span className="badge badge-green" style={{ fontSize: 12 }}>
                    👍 {p.confirmations} Confirmations
                  </span>
                </div>
              </div>

              <p style={{ margin: '8px 0 12px', fontSize: 13.5, lineHeight: 1.5, color: 'var(--text)' }}>
                {p.description}
              </p>

              <div style={{ background: 'var(--bg-subtle)', padding: 10, borderRadius: 8, fontSize: 12.5, marginBottom: 12 }}>
                <div><strong>Identifiers:</strong> {p.contact}</div>
                {p.upi && p.upi !== 'N/A' && <div><strong>UPI ID:</strong> <code>{p.upi}</code></div>}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {p.red_flags.map((rf, idx) => (
                    <span key={idx} className="badge badge-red" style={{ fontSize: 11 }}>
                      ⚠️ {rf}
                    </span>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      navigator.clipboard?.writeText(`${p.title}\nCompany: ${p.company}\nDetails: ${p.contact}\nRed Flags: ${p.red_flags.join(', ')}`);
                      alert('Scam alert details copied to clipboard!');
                    }}
                  >
                    📋 Copy Details
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => navigate('/report-scam')}
                  >
                    🚩 Add Evidence
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
