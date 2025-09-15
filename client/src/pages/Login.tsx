import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api, type User } from '../lib/api'
import { useToasts } from '../components/Toast'

const Login: React.FC<{ onLoggedIn: (user: User, password: string) => void | Promise<void>, theme: 'dark'|'light', onToggleTheme: () => void }> = ({ onLoggedIn, theme, onToggleTheme }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [needsMfa, setNeedsMfa] = useState(false)
  const [totp, setTotp] = useState('')
  const [recovery, setRecovery] = useState('')
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()
  const { push } = useToasts()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      const res = await api.login(email, password, totp || undefined, recovery || undefined)
      if (res.mfaRequired) { setNeedsMfa(true); push('MFA requis'); return }
      if (res.user) {
        await onLoggedIn(res.user, password)
        push('Connecté')
        nav('/')
      }
    } catch (e: any) {
      push(e.message || 'Erreur', 'error')
    } finally { setLoading(false) }
  }

  return (
    <div className="auth">
      <div className="auth-card">
        <div className="auth-panel">
          <div className="row between">
            <div className="logo-line"><span className="accent">S1</span>VAULT</div>
            <button className="btn ghost" type="button" onClick={onToggleTheme} aria-label="Basculer le thème">{theme === 'dark' ? '☀️ Mode clair' : '🌙 Mode sombre'}</button>
          </div>
          <h1 className="headline">Connexion</h1>
          <p className="subhead muted">Accédez à votre coffre fort chiffré de bout en bout.</p>

          <form onSubmit={submit} className="grid mt-12" aria-label="Formulaire de connexion">
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="vous@domaine.com" autoComplete="email" required />
            </div>
            <div className="field">
              <label htmlFor="password">Mot de passe maître</label>
              <input id="password" className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Votre phrase secrète…" autoComplete="current-password" required />
            </div>

            {needsMfa && (
              <>
                <div className="field">
                  <label htmlFor="totp">Code TOTP (6 chiffres)</label>
                  <input id="totp" className="input" inputMode="numeric" pattern="\\d{6}" value={totp} onChange={e=>setTotp(e.target.value)} placeholder="000000" />
                </div>
                <div className="field">
                  <label htmlFor="recovery">Ou code de récupération</label>
                  <input id="recovery" className="input" value={recovery} onChange={e=>setRecovery(e.target.value)} placeholder="ABCD-EFGH" />
                </div>
              </>
            )}

            <div className="row right mt-12">
              <button className="btn primary" disabled={loading}>{loading ? '…' : 'Se connecter'}</button>
            </div>
          </form>
          <div className="small muted mt-12">Pas de compte ? <Link to="/register">Créer un coffre</Link></div>
        </div>

        <aside className="auth-aside">
          <h3>À propos</h3>
          <ul className="small muted bullets">
            <li>Chiffrement de bout en bout (AES‑GCM 256)</li>
            <li>Clé dérivée via PBKDF2 (SHA‑256)</li>
            <li>2FA TOTP et codes de récupération</li>
            <li>Détection de réutilisation (empreintes tronquées)</li>
          </ul>
        </aside>
      </div>
    </div>
  )
}

export default Login
