import { useState } from 'react'

export default function EntityCard({ entities = {}, onSave, saving = false }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(entities)

  function handleSave() {
    onSave(draft)
    setEditing(false)
  }

  return (
    <div className="cyber-card animate-fade-in" style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h3 className="section-title mb-0">📋 Extracted Opportunity Information</h3>
        {!editing ? (
          <button className="btn btn-outline btn-sm" onClick={() => { setDraft(entities); setEditing(true); }}>
            ✏️ Edit Details
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline btn-sm" onClick={() => setEditing(false)}>Cancel</button>
            <button className="btn btn-primary btn-sm" disabled={saving} onClick={handleSave}>
              {saving ? 'Saving…' : 'Save & Re-calculate'}
            </button>
          </div>
        )}
      </div>

      {!editing ? (
        <div className="grid-2">
          <div className="kv-list">
            <div className="kv-row"><span className="k">Company Name</span><span className="v">{entities.organization || '—'}</span></div>
            <div className="kv-row"><span className="k">Job Role / Title</span><span className="v">{entities.title || '—'}</span></div>
            <div className="kv-row"><span className="k">Salary / Amount</span><span className="v">{(entities.amounts_found || []).map(a => '₹' + a).join(', ') || 'Not specified'}</span></div>
            <div className="kv-row"><span className="k">Location</span><span className="v">{entities.location || '—'}</span></div>
          </div>
          <div className="kv-list">
            <div className="kv-row"><span className="k">Phone Number(s)</span><span className="v">{(entities.phones || []).join(', ') || '—'}</span></div>
            <div className="kv-row"><span className="k">Email Address(es)</span><span className="v">{(entities.emails || []).join(', ') || '—'}</span></div>
            <div className="kv-row"><span className="k">Website(s)</span><span className="v">{(entities.websites || []).join(', ') || '—'}</span></div>
            <div className="kv-row"><span className="k">UPI ID(s)</span><span className="v">{(entities.upi_ids || []).join(', ') || '—'}</span></div>
          </div>
        </div>
      ) : (
        <div className="grid-2" style={{ gap: 14 }}>
          <div>
            <label className="field-label" style={{ marginTop: 0 }}>Company Name</label>
            <input type="text" value={draft.organization || ''} onChange={ev => setDraft({ ...draft, organization: ev.target.value })} />
          </div>
          <div>
            <label className="field-label" style={{ marginTop: 0 }}>Job Role</label>
            <input type="text" value={draft.title || ''} onChange={ev => setDraft({ ...draft, title: ev.target.value })} />
          </div>
          <div>
            <label className="field-label">Location</label>
            <input type="text" value={draft.location || ''} onChange={ev => setDraft({ ...draft, location: ev.target.value })} />
          </div>
          <div>
            <label className="field-label">Phones (comma separated)</label>
            <input type="text" value={(draft.phones || []).join(', ')} onChange={ev => setDraft({ ...draft, phones: ev.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
          </div>
        </div>
      )}
    </div>
  )
}
