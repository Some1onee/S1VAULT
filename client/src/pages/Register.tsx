import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api, type User } from '../lib/api'
import { useToasts } from '../components/Toast'

const Register: React.FC<{ onRegistered: (user: User, password: string) => void | Promise<void>, theme: 'dark'|'light', onToggleTheme: () => void }> = ({ onRegistered, theme, onToggleTheme }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()
  const { push } = useToasts()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      const { user, recoveryCodes } = await api.register(email, password)
      setRecoveryCodes(recoveryCodes)
      await onRegistered(user, password)
      push('Compte créé')
      nav('/')
    } catch (e: any) { push(e.message || 'Erreur', 'error') }
    finally { setLoading(false) }
  }

  return (
    <div className="auth">
      <div className="auth-card">
        <div className="auth-panel">
          <div className="row between">
            <div className="logo-line"><span className="accent">S1</span>VAULT</div>
            <button className="btn ghost" type="button" onClick={onToggleTheme} aria-label="Basculer le thème">{theme === 'dark' ? '☀️ Mode clair' : '🌙 Mode sombre'}</button>
          </div>
          <h1 className="headline">Créer un coffre</h1>
          <p className="subhead muted">Votre coffre chiffré de bout en bout. Vous seul détenez la clé.</p>

          <form onSubmit={submit} className="grid mt-12" aria-label="Formulaire de création de coffre">
            <div className="field">
              <label htmlFor="reg-email">Email</label>
              <input id="reg-email" className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="vous@domaine.com" autoComplete="email" required />
            </div>
            <div className="field">
              <label htmlFor="reg-password">Mot de passe maître</label>
              <input id="reg-password" className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Phrase secrète longue…" autoComplete="new-password" required />
            </div>
            <div className="row right mt-12"><button className="btn primary" disabled={loading}>{loading ? '…' : 'Créer le coffre'}</button></div>
          </form>
          <div className="small muted mt-12">Déjà un compte ? <Link to="/login">Connexion</Link></div>
        </div>

        <aside className="auth-aside">
          <h3>Codes de récupération</h3>
          {!recoveryCodes && <p className="small muted">Ils apparaîtront après la création. Conservez‑les en lieu sûr pour les urgences (2FA perdue).</p>}
          {recoveryCodes && (
            <ul className="list small">{recoveryCodes.map(c => <li key={c} className="badge mono">{c}</li>)}</ul>
          )}
        </aside>
      </div>
    </div>
  )
}
export default Register
