import { useState, useEffect } from 'react'

const MULTI_RECOMMENDATIONS = {
  en: [
    { icon: '⚠️', title: 'DO NOT PAY ANY MONEY', desc: 'Legitimate employers never ask candidates to pay registration fees, security deposits, or training fees before joining.' },
    { icon: '🔍', title: 'VERIFY THE COMPANY', desc: 'Independently check the company website, official LinkedIn presence, and verify whether the vacancy exists on their official careers page.' },
    { icon: '📧', title: 'VERIFY EMAIL & CONTACTS', desc: 'Check whether communication originated from an authentic corporate domain rather than a free personal provider (e.g., Gmail/Yahoo).' },
    { icon: '📞', title: 'DO NOT SHARE SENSITIVE OTPS', desc: 'Never disclose bank account PINs, OTPs, or password credentials to any recruiter or hiring manager.' },
  ],
  ta: [
    { icon: '⚠️', title: 'பணம் எதுவும் செலுத்த வேண்டாம்', desc: 'உண்மையான நிறுவனங்கள் வேலைக்கு சேர்வதற்கு முன் பதிவுக் கட்டணம், முன்பணம் அல்லது பயிற்சி கட்டணம் கேட்காது.' },
    { icon: '🔍', title: 'நிறுவனத்தை சரிபார்க்கவும்', desc: 'நிறுவனத்தின் அதிகாரப்பூர்வ இணையதளம் மற்றும் தொழில்முறை சுயவிவரங்களை சுயமாக ஆராயுங்கள்.' },
    { icon: '📧', title: 'மின்னஞ்சலை சரிபார்க்கவும்', desc: 'தொடர்பு நிறுவனத்தின் சொந்த டொமைனிலிருந்து வருகிறதா அல்லது தனிப்பட்ட ஜிமெயில் கணக்கா என்பதை உறுதிப்படுத்தவும்.' },
    { icon: '📞', title: 'OTP மற்றும் கடவுச்சொற்களை பகிராதீர்கள்', desc: 'வங்கி கணக்கு விவரங்கள், OTP அல்லது கடவுச்சொற்களை யாரிடமும் பகிர வேண்டாம்.' },
  ],
  hi: [
    { icon: '⚠️', title: 'कोई पैसे न दें', desc: 'वास्तविक कंपनियां नौकरी या इंटर्नशिप के लिए पंजीकरण शुल्क या सुरक्षा जमा राशि कभी नहीं मांगतीं।' },
    { icon: '🔍', title: 'कंपनी का सत्यापन करें', desc: 'कंपनी की आधिकारिक वेबसाइट और करियर पेज पर जाकर जांच करें कि क्या यह पद वास्तव में खुला है।' },
    { icon: '📧', title: 'ईमेल और संपर्क की पुष्टि करें', desc: 'सुनिश्चित करें कि भर्ती ईमेल आधिकारिक कॉर्पोरेट डोमेन से आया है, न कि व्यक्तिगत जीमेल/याहू से।' },
    { icon: '📞', title: 'OTP कभी साझा न करें', desc: 'किसी भी भर्तीकर्ता के साथ अपने बैंक विवरण, पासवर्ड या OTP साझा न करें।' },
  ],
}

export default function RecommendationCard() {
  const [lang, setLang] = useState(() => localStorage.getItem('jobshield_lang') || 'en')

  useEffect(() => {
    const handleLang = () => setLang(localStorage.getItem('jobshield_lang') || 'en')
    window.addEventListener('language-change', handleLang)
    return () => window.removeEventListener('language-change', handleLang)
  }, [])

  const recs = MULTI_RECOMMENDATIONS[lang] || MULTI_RECOMMENDATIONS['en']

  return (
    <div className="cyber-card animate-fade-in" style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <h3 className="section-title mb-0">🛡️ Personalized Safety Recommendations</h3>
        <div style={{ display: 'flex', gap: 6 }}>
          {['en', 'ta', 'hi'].map(l => (
            <button
              key={l}
              className={`btn btn-sm ${lang === l ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '3px 10px', fontSize: 11.5 }}
              onClick={() => { setLang(l); localStorage.setItem('jobshield_lang', l); }}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        {recs.map((r, i) => (
          <div key={i} style={{ padding: 14, background: 'var(--bg-subtle)', borderRadius: 10 }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{r.icon}</div>
            <strong style={{ fontSize: 13.5, display: 'block', marginBottom: 4 }}>{r.title}</strong>
            <p className="muted" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5 }}>{r.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
