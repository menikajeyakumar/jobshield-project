import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

export default function AIChatAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Hello! I am JobShield AI. Ask me anything about job scams, offer letter verification, suspicious recruiters, or payment requests.',
      time: 'Just now'
    }
  ])
  const messagesEndRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen, isTyping])

  const QUICK_QUESTIONS = [
    'Is it normal to pay for internship training?',
    'How do I spot a fake offer letter?',
    'What is a Telegram task scam?',
    'Should I send my Aadhaar before joining?',
    'How to verify a recruiter email?'
  ]

  function getAiResponse(userText) {
    const q = userText.toLowerCase()

    if (q.includes('pay') || q.includes('fee') || q.includes('deposit') || q.includes('charge') || q.includes('registration') || q.includes('money') || q.includes('training fee')) {
      return `🚨 **CRITICAL RISK:** Legitimate employers and authorized recruiters NEVER ask candidates to pay for registration, background checks, training kits, or laptop couriers.\n\n• According to Indian labor guidelines and corporate policies, genuine hiring is 100% free.\n• If they demand payment via UPI or personal bank account, it is almost certainly a scam.`
    }
    if (q.includes('offer letter') || q.includes('fake offer') || q.includes('appointment')) {
      return `🔍 **OFFER LETTER VERIFICATION CHECKLIST:**\n\n1. **Official Domain:** Check if the email came from @company.com (not @gmail.com or @outlook.com).\n2. **CIN & Address:** Legitimate companies have a valid Corporate Identification Number (CIN) verifiable on mca.gov.in.\n3. **Interview Process:** Did they offer the job without a live technical or HR video interview? If yes, it is likely fake.\n4. **Payment Requests:** Real offer letters never require an 'acceptance fee'.`
    }
    if (q.includes('telegram') || q.includes('task') || q.includes('youtube') || q.includes('like') || q.includes('whatsapp') || q.includes('prepaid')) {
      return `⚠️ **PREPAID TASK SCAM ALERT:**\n\n• Fraudsters message on WhatsApp/Telegram offering ₹1,500–₹5,000/day for liking YouTube videos, rating Google Maps, or completing review tasks.\n• They pay ₹150–₹300 initially to earn your trust.\n• Then they ask you to deposit money into a 'VIP prepaid task' wallet, which you can never withdraw. Do NOT deposit any money!`
    }
    if (q.includes('aadhaar') || q.includes('pan') || q.includes('document') || q.includes('bank account') || q.includes('identity')) {
      return `🛡️ **DOCUMENT SAFETY ADVICE:**\n\n• Never share unmasked Aadhaar or bank passbooks before receiving a formal, verified offer letter.\n• Only submit documents through official company employee onboarding portals (e.g., Workday, Darwinbox) with signed NDAs.\n• Scammers use stolen Aadhaar cards to take out fraudulent loans in your name.`
    }
    if (q.includes('email') || q.includes('recruiter') || q.includes('hr')) {
      return `📧 **RECRUITER EMAIL VERIFICATION:**\n\n• Official recruiters use business emails (e.g. name@tcs.com, recruiter@amazon.com).\n• Watch out for typosquatting domains (e.g. careers-amazon.site, hr-infosys.org, tcs-recruitment.in).\n• Real HR representatives will never conduct entire hiring interviews via WhatsApp or Telegram text messages.`
    }

    return `🛡️ **JobShield AI Analysis:**\n\nBased on recruitment fraud heuristics, remember to check:\n• Never pay any upfront fee\n• Verify the corporate domain on whois\n• Inspect offer letters for official stamps and valid corporate addresses.\n\n👉 *Tip: You can test the full opportunity text or poster in our **Check Opportunity** scanner for deep machine learning analysis!*`
  }

  function handleSend(textToSend) {
    const query = textToSend || input
    if (!query.trim()) return

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    setTimeout(() => {
      const reply = getAiResponse(query)
      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      setMessages(prev => [...prev, botMsg])
      setIsTyping(false)
    }, 600)
  }

  return (
    <div className="ai-chat-bubble">
      {!isOpen ? (
        <button
          className="ai-chat-btn"
          onClick={() => setIsOpen(true)}
          title="Ask JobShield AI Security Assistant"
          aria-label="Open AI Assistant"
        >
          <span style={{ fontSize: 18 }}>🛡️</span>
          <span>Ask JobShield AI</span>
        </button>
      ) : (
        <div className="ai-chat-modal">
          <div className="chat-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>🛡️</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>JobShield AI Assistant</div>
                <div style={{ fontSize: 11, opacity: 0.85 }}>● Online · Scam Defense AI</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => setMessages([{
                  id: 1,
                  sender: 'bot',
                  text: 'Chat cleared. How can I help you verify an opportunity today?',
                  time: 'Just now'
                }])}
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13 }}
                title="Clear Chat"
              >
                🔄
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16, fontWeight: 700 }}
                title="Minimize Assistant"
              >
                ✕
              </button>
            </div>
          </div>

          <div style={{ padding: '8px 12px', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 6, overflowX: 'auto', whiteSpace: 'nowrap' }}>
            {QUICK_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                style={{
                  fontSize: 11.5,
                  padding: '4px 8px',
                  borderRadius: 999,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  cursor: 'pointer'
                }}
              >
                {q}
              </button>
            ))}
          </div>

          <div className="chat-messages">
            {messages.map(m => (
              <div key={m.id} className={`chat-msg ${m.sender}`}>
                <div style={{ whiteSpace: 'pre-line' }}>{m.text}</div>
                <div style={{ fontSize: 10, opacity: 0.65, marginTop: 4, textAlign: m.sender === 'user' ? 'right' : 'left' }}>
                  {m.time}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="chat-msg bot" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="spinner" style={{ width: 12, height: 12 }} />
                <span style={{ fontSize: 12 }}>JobShield AI is analyzing…</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div style={{ padding: '6px 12px', background: 'var(--surface)', borderTop: '1px solid var(--border-subtle)', fontSize: 11.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="muted">Need full opportunity scan?</span>
            <button
              className="btn btn-outline btn-sm"
              style={{ padding: '2px 8px', fontSize: 11 }}
              onClick={() => { setIsOpen(false); navigate('/verify'); }}
            >
              Go to Scanner →
            </button>
          </div>

          <form
            className="chat-input-area"
            onSubmit={e => { e.preventDefault(); handleSend(); }}
          >
            <input
              type="text"
              placeholder="Ask a question or paste message…"
              value={input}
              onChange={e => setInput(e.target.value)}
              style={{ flex: 1, padding: '8px 12px', fontSize: 13 }}
            />
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={!input.trim() || isTyping}
              style={{ padding: '0 14px' }}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
