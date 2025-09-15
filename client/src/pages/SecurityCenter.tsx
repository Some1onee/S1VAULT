import React, { useEffect, useState } from 'react'
import { api } from '../lib/api'

const SecurityCenter: React.FC = () => {
  const [summary, setSummary] = useState<{ weak: number, reused: number, old180d: number, no2FA: number, total: number }|null>(null)
  const [problems, setProblems] = useState<any[]>([])
  const [totpSecret, setTotpSecret] = useState<string | null>(null)
  const [otpauth, setOtpauth] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [enabling, setEnabling] = useState(false)

  useEffect(() => {
    api.securitySummary().then(setSummary)
    api.securityProblems().then(setProblems)
  }, [])

  return (
    <div className="page">
      <div className="card">
        <h2>Score & résumé</h2>
        {!summary && <div className="small muted">Chargement…</div>}
        {summary && (
          <div className="grid cols-3">
            <div className="badge weak">Faibles: {summary.weak}</div>
            <div className="badge">Réutilisés: {summary.reused}</div>
            <div className="badge">Anciens &gt; 180j: {summary.old180d}</div>
            <div className="badge">Sans 2FA: {summary.no2FA}</div>
            <div className="badge">Total: {summary.total}</div>
          </div>
        )}
      </div>
      <div className="card">
        <h3>Problèmes</h3>
        <table className="table">
          <thead><tr><th>Nom</th><th>Domaine</th><th>Raisons</th><th>Sévérité</th></tr></thead>
          <tbody>
            {problems.map(p => (
              <tr key={p.id}><td>{p.title}</td><td>{p.domain||''}</td><td>{(p.reasons||[]).join(', ')}</td><td>{p.severity}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Activer la 2FA (TOTP)</h3>
        {!totpSecret && (
          <div className="row">
            <button className="btn" onClick={async()=>{ const r = await api.totpSetup(); setTotpSecret(r.secret); setOtpauth(r.otpauth); }}>Générer un secret</button>
          </div>
        )}
        {totpSecret && (
          <div className="grid">
            <div className="small">Secret: <code>{totpSecret}</code></div>
            {otpauth && <div className="small">otpauth: <a href={otpauth}>{otpauth}</a></div>}
            <div className="field"><label>Code TOTP (6 chiffres)</label><input className="input" inputMode="numeric" value={code} onChange={e=>setCode(e.target.value)} placeholder="000000" /></div>
            <div className="row right"><button className="btn primary" disabled={enabling} onClick={async()=>{ setEnabling(true); try { const r = await api.totpEnable(code); alert('2FA activée. Codes de récupération:\n' + r.recoveryCodes.join('\n')); } finally { setEnabling(false); } }}>Activer</button></div>
          </div>
        )}
      </div>
    </div>
  )
}
export default SecurityCenter
