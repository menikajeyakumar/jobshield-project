import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'

const TEXTS = {
  en: {
    badge: '🛡️ AI-Powered Opportunity Safety Platform',
    title1: 'Verify Opportunities.',
    title2: 'Before You Trust Them.',
    subtitle: 'JobShield uses hybrid AI, OCR, contact verification, and scam pattern detection to help students and job seekers identify potentially fake jobs, internships, scholarships, and certificates.',
    checkBtn: '🔍 Check an Opportunity',
    howBtn: '▶ How It Works',
    stat1Label: 'Opportunities Checked',
    stat2Label: 'Scams Detected',
    stat3Label: 'Detection Accuracy',
    stat4Label: 'Scam Patterns',
    step1Title: 'STEP 1: Upload or Paste',
    step1Desc: 'Upload a poster, screenshot, certificate, PDF, paste a message or enter an opportunity URL.',
    step2Title: 'STEP 2: AI & OCR Analysis',
    step2Desc: 'OCR extracts raw text and AI entities (UPI, contact numbers, organization, salary claims).',
    step3Title: 'STEP 3: Risk & Pattern Detection',
    step3Desc: 'Checks against known scam patterns, fee requests, suspicious URLs, and duplicate advertisements.',
    step4Title: 'STEP 4: Get Safety Results',
    step4Desc: 'Receive a transparent 0-100 risk score, explainable evidence, and actionable safety steps.',
  },
  ta: {
    badge: '🛡️ AI-ஆல் இயங்கும் போலி வேலை வாய்ப்பு கண்டறிதல் தளம்',
    title1: 'வாய்ப்புகளை சரிபார்க்கவும்.',
    title2: 'நம்புவதற்கு முன்.',
    subtitle: 'வேலை, இன்டர்ன்ஷிப், உதவித்தொகை மற்றும் சான்றிதழ்களில் உள்ள மோசடிகளை கண்டறிய JobShield AI மற்றும் OCR தொழில்நுட்பத்தை பயன்படுத்துகிறது.',
    checkBtn: '🔍 வாய்ப்பை சரிபார்க்கவும்',
    howBtn: '▶ இது எப்படி செயல்படுகிறது',
    stat1Label: 'சரிபார்க்கப்பட்ட வாய்ப்புகள்',
    stat2Label: 'கண்டறியப்பட்ட மோசடிகள்',
    stat3Label: 'துல்லிய விகிதம்',
    stat4Label: 'மோசடி மாதிரிகள்',
    step1Title: 'படி 1: பதிவேற்றவும் அல்லது உள்ளிடவும்',
    step1Desc: 'விளம்பரம், ஸ்கிரீன்ஷாட், சான்றிதழ், PDF பதிவேற்றவும் அல்லது உரையை உள்ளிடவும்.',
    step2Title: 'படி 2: AI & OCR ஆய்வு',
    step2Desc: 'OCR மூலம் உரை பிரித்தெடுக்கப்பட்டு தொடர்பு விவரங்கள் மற்றும் நிறுவனம் ஆராயப்படுகின்றன.',
    step3Title: 'படி 3: ஆபத்து கண்டறிதல்',
    step3Desc: 'பதிவுக் கட்டணங்கள், சந்தேகத்திற்கிடமான URLகள் மற்றும் போலி பதிவுகள் சரிபார்க்கப்படுகின்றன.',
    step4Title: 'படி 4: முடிவுகளை பெறுங்கள்',
    step4Desc: 'மதிப்பெண், கண்டறியப்பட்ட சிக்கல்கள் மற்றும் தெளிவான பாதுகாப்பு பரிந்துரைகள்.',
  },
  hi: {
    badge: '🛡️ AI-आधारित अवसर सुरक्षा मंच',
    title1: 'अवसरों को सत्यापित करें।',
    title2: 'विश्वास करने से पहले।',
    subtitle: 'जॉबशील्ड फर्जी नौकरियों, इंटर्नशिप, छात्रवृत्तियों और प्रमाणपत्रों की पहचान करने के लिए AI, OCR और जोखिम विश्लेषण का उपयोग करता है।',
    checkBtn: '🔍 अवसर की जांच करें',
    howBtn: '▶ यह कैसे काम करता है',
    stat1Label: 'जांचे गए अवसर',
    stat2Label: 'पहचाने गए घोटाले',
    stat3Label: 'सटीकता दर',
    stat4Label: 'घोटाले के पैटर्न',
    step1Title: 'चरण 1: अपलोड या पेस्ट करें',
    step1Desc: 'पोस्टर, स्क्रीनशॉट, प्रमाणपत्र, PDF अपलोड करें या संदेश/URL पेस्ट करें।',
    step2Title: 'चरण 2: AI और OCR विश्लेषण',
    step2Desc: 'OCR टेक्स्ट निकालता है और AI संपर्क, UPI और संस्था का विश्लेषण करता है।',
    step3Title: 'चरण 3: जोखिम पहचान',
    step3Desc: 'पंजीकरण शुल्क, संदिग्ध लिंक और पहले से दर्ज धोखाधड़ी के मामलों की जांच।',
    step4Title: 'चरण 4: परिणाम प्राप्त करें',
    step4Desc: 'जोखिम स्कोर, साक्ष्य और तुरंत क्या करना चाहिए इसकी सुरक्षा सलाह प्राप्त करें।',
  },
}

const CATEGORIES = [
  '💼 Part-Time Jobs', '🎓 Internships', '💰 Work-From-Home', '📚 Courses / Training',
  '🏆 Scholarships', '🎁 Govt / Private Schemes', '🏢 Recruitment Offers',
  '📄 Certificates', '💻 Freelance Offers', '📢 Placement / Job Fairs',
]

const FEATURES = [
  { emoji: '🧠', title: 'Hybrid AI Classifier', desc: 'Logistic Regression trained on 17,800+ real and fake job postings combined with multi-rule risk evaluation.', color: 'var(--primary)' },
  { emoji: '💳', title: 'Payment & Fee Detection', desc: 'Identifies upfront registration, security deposit, and personal UPI transfer requests.', color: 'var(--red)' },
  { emoji: '🗄️', title: 'Scam Pattern Database', desc: 'Real-time cross-referencing against verified fraud domains, phone numbers, and Telegram recruitment links.', color: 'var(--amber)' },
  { emoji: '🧬', title: 'Duplicate Ad Detection', desc: 'Levenshtein similarity checks identify recycled fake advertisements across different platforms.', color: '#8b5cf6' },
  { emoji: '🌐', title: 'URL & Domain Security', desc: 'Verifies domain creation age, typosquatting, HTTPS status, and authentic company records.', color: 'var(--primary)' },
  { emoji: '📄', title: 'Certificate Verification', desc: 'Scans QR codes and verification registries to flag fabricated certificates.', color: 'var(--green)' },
]

const TIMELINE_STEPS = [
  { icon: '📤', step: 1 },
  { icon: '🔍', step: 2 },
  { icon: '🛡️', step: 3 },
  { icon: '📊', step: 4 },
]

export default function Landing() {
  const navigate = useNavigate()
  const [lang, setLang] = useState(() => localStorage.getItem('jobshield_lang') || 'en')

  useEffect(() => {
    const handleLang = () => setLang(localStorage.getItem('jobshield_lang') || 'en')
    window.addEventListener('language-change', handleLang)
    return () => window.removeEventListener('language-change', handleLang)
  }, [])

  const t = TEXTS[lang] || TEXTS['en']

  const scrollToTimeline = () => {
    document.getElementById('how-it-works-section')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: 80 }}>

      {/* ── Hero Section ── */}
      <section className="hero-v2" style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Animated shield icon */}
        <span className="landing-shield-anim">🛡️</span>

        <div className="hero-badge">{t.badge}</div>

        <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', lineHeight: 1.15 }}>
          {t.title1}<br />
          <span style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, #6366f1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            {t.title2}
          </span>
        </h1>

        <p className="hero-sub" style={{ maxWidth: 620, margin: '0 auto 32px' }}>{t.subtitle}</p>

        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 36 }}>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/verify')}>
            {t.checkBtn}
          </button>
          <button className="btn btn-outline btn-lg" onClick={scrollToTimeline}>
            {t.howBtn}
          </button>
        </div>

        {/* Stat counters */}
        <div className="stat-counters">
          <div className="stat-counter-card">
            <div className="val">25,000+</div>
            <div className="lbl">{t.stat1Label}</div>
          </div>
          <div className="stat-counter-card">
            <div className="val" style={{ color: 'var(--red)' }}>1,200+</div>
            <div className="lbl">{t.stat2Label}</div>
          </div>
          <div className="stat-counter-card">
            <div className="val" style={{ color: 'var(--green)' }}>95%</div>
            <div className="lbl">{t.stat3Label}</div>
          </div>
          <div className="stat-counter-card">
            <div className="val" style={{ color: 'var(--secondary, #6366f1)' }}>50+</div>
            <div className="lbl">{t.stat4Label}</div>
          </div>
        </div>

        {/* Trust badges row */}
        <div className="landing-trust-row">
          <div className="landing-trust-badge">🔒 256-bit SSL Encrypted</div>
          <div className="landing-trust-badge">🤖 Trained on 17,800+ samples</div>
          <div className="landing-trust-badge">🌍 EN / தமிழ் / हिंदी</div>
          <div className="landing-trust-badge">⚡ Results in &lt;2 seconds</div>
        </div>
      </section>

      {/* ── How It Works Timeline ── */}
      <section id="how-it-works-section" style={{ marginTop: 60 }}>
        <div className="center" style={{ marginBottom: 32 }}>
          <span className="badge-pill badge-blue" style={{ marginBottom: 10 }}>PROCESS WORKFLOW</span>
          <h2 style={{ fontSize: 30, margin: '8px 0 10px', letterSpacing: '-0.5px' }}>
            How JobShield 2.0 Works
          </h2>
          <p className="muted" style={{ maxWidth: 560, margin: '0 auto', fontSize: 15 }}>
            From raw input to explainable risk classification in under 2 seconds.
          </p>
        </div>

        <div className="timeline-grid">
          {TIMELINE_STEPS.map((s, i) => (
            <div className="timeline-step" key={s.step}>
              <span className="step-badge">{[t.step1Title, t.step2Title, t.step3Title, t.step4Title][i]}</span>
              <div style={{ fontSize: 36, marginBottom: 10 }}>{s.icon}</div>
              <h4 style={{ margin: '0 0 8px' }}>
                {['Input Ingestion', 'Extraction & OCR', 'Risk Detection', 'Explainable Report'][i]}
              </h4>
              <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>
                {[t.step1Desc, t.step2Desc, t.step3Desc, t.step4Desc][i]}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section style={{ marginTop: 60 }}>
        <div className="center" style={{ marginBottom: 28 }}>
          <span className="badge-pill badge-blue" style={{ marginBottom: 10 }}>CAPABILITIES</span>
          <h2 style={{ fontSize: 28, margin: '6px 0 8px' }}>Advanced Cybersecurity Capabilities</h2>
          <p className="muted" style={{ fontSize: 14 }}>Engineered to safeguard against modern recruitment deception.</p>
        </div>

        <div className="grid-3">
          {FEATURES.map(f => (
            <div className="cyber-card card-hover" key={f.title} style={{ borderTop: `3px solid ${f.color}` }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{f.emoji}</div>
              <h3 style={{ fontSize: 16, margin: '0 0 8px', fontWeight: 800 }}>{f.title}</h3>
              <p className="muted" style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Supported Categories ── */}
      <section style={{ marginTop: 60, textAlign: 'center' }}>
        <span className="badge-pill badge-gray" style={{ marginBottom: 12 }}>COVERAGE</span>
        <h3 style={{ fontSize: 20, marginBottom: 18 }}>Supported Verification Categories</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
          {CATEGORIES.map(c => (
            <span
              key={c}
              className="filter-chip"
              style={{ cursor: 'default' }}
            >
              {c}
            </span>
          ))}
        </div>
      </section>

      {/* ── Risk Color Legend ── */}
      <section style={{ marginTop: 50 }}>
        <div className="cyber-card" style={{ padding: '28px 32px' }}>
          <h3 style={{ margin: '0 0 18px', fontSize: 18, fontWeight: 800 }}>🎨 Risk Color Guide</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            {[
              { label: 'Safe', sublabel: 'Score ≤ 30', cls: 'badge-green', dot: '🟢' },
              { label: 'Low Risk', sublabel: 'Score 31–50', cls: 'badge-blue', dot: '🔵' },
              { label: 'Suspicious', sublabel: 'Score 51–65', cls: 'badge-yellow', dot: '🟡' },
              { label: 'High Risk', sublabel: 'Score 66–80', cls: 'badge-orange', dot: '🟠' },
              { label: 'Scam / Fraud', sublabel: 'Score > 80', cls: 'badge-red', dot: '🔴' },
            ].map(r => (
              <div key={r.label} style={{ textAlign: 'center', padding: '14px 10px', background: 'var(--bg-subtle)', borderRadius: 10 }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{r.dot}</div>
                <span className={`badge-pill ${r.cls}`}>{r.label}</span>
                <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>{r.sublabel}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cyber-card cyber-card-glow" style={{
        marginTop: 50,
        textAlign: 'center',
        padding: '48px 24px',
        background: 'linear-gradient(135deg, rgba(37,99,235,0.07), rgba(99,102,241,0.1))',
        border: '1px solid rgba(37,99,235,0.2)',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🛡️</div>
        <h2 style={{ fontSize: 28, margin: '0 0 12px', letterSpacing: '-0.5px' }}>Ready to Verify an Opportunity?</h2>
        <p className="muted" style={{ maxWidth: 520, margin: '0 auto 28px', fontSize: 15 }}>
          Never send money or confidential documents without checking first. Free, instant, and private.
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/verify')}>
            🔍 Check Now with JobShield AI
          </button>
          <button className="btn btn-outline btn-lg" onClick={() => navigate('/register')}>
            📝 Create Free Account
          </button>
        </div>
      </section>
    </div>
  )
}
