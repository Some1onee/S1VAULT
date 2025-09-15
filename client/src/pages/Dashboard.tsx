import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type VaultEntry } from '../lib/api'
import { useToasts } from '../components/Toast'
import { encryptJson, passwordStrength, sha256Hex } from '../lib/crypto'
import type { AuthState } from '../App'

const Dashboard: React.FC<{ auth: AuthState }> = ({ auth }) => {
  const [items, setItems] = useState<VaultEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const { push } = useToasts()

  const load = async () => {
    setLoading(true)
    try { setItems(await api.listEntries()) } catch (e: any) { push(e.message,'error') } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  return (
    <div className="page">
      {showNew && <NewEntry auth={auth} onCreated={()=>{ setShowNew(false); load(); }} />}

      <div className="card">
        <div className="row between">
          <h2>Vos entrées</h2>
          <button className="btn primary" onClick={()=>setShowNew(v=>!v)}>{showNew?'Fermer':'Nouvelle entrée'}</button>
        </div>
        {loading && <div className="small muted">Chargement…</div>}
        {!loading && items.length===0 && <div className="small muted">Aucune entrée</div>}
        <div className="list">
          {items.map(e => (
            <div className="entry" key={e.id}>
              <div className="meta">
                <div className="title">{e.title}</div>
                <div className="sub">{e.domain || e.url || ''}</div>
                <div className="small muted">Force: <span className={`badge ${e.strength<40?'weak':e.strength<70?'medium':'strong'}`}>{e.strength}</span> {e.has2FA && <span className="badge">2FA</span>}</div>
              </div>
              <div className="actions">
                <Link className="btn" to={`/entry/${e.id}`}>Ouvrir</Link>
                <button className="btn" onClick={async ()=>{ await api.updateEntry(e.id, { favorite: !e.favorite }); load(); }}>{e.favorite? '★' : '☆'}</button>
                <button className="btn danger" onClick={async ()=>{ if(confirm('Supprimer ?')){ await api.deleteEntry(e.id); load(); } }}>Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const NewEntry: React.FC<{ auth: AuthState, onCreated: ()=>void }> = ({ auth, onCreated }) => {
  const [title, setTitle] = useState('')
  const [domain, setDomain] = useState('')
  const [url, setUrl] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [tags, setTags] = useState('')
  const [has2FA, setHas2FA] = useState(false)
  const [saving, setSaving] = useState(false)
  const { push } = useToasts()

  const canSave = !!(title && username && password)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth.masterKey) { push('Re-connexion requise pour chiffrer', 'error'); return }
    try {
      setSaving(true)
      const secret = { username, password }
      const { cipherText, iv } = await encryptJson(secret, auth.masterKey)
      const strength = passwordStrength(password)
      const secretFingerprint = (await sha256Hex(password)).slice(0, 16)
      await api.createEntry({ title, domain, url, tags, has2FA, cipherText, iv, strength, secretFingerprint })
      push('Créé')
      onCreated()
    } catch (e: any) { push(e.message || 'Erreur', 'error') }
    finally { setSaving(false) }
  }

  return (
    <div className="card">
      <h3>Nouvelle entrée</h3>
      <form onSubmit={submit} className="form-grid">
        <div className="field"><label>Titre</label><input className="input" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ex: GitHub — perso" required /></div>
        <div className="field"><label>Domaine</label><input className="input" value={domain} onChange={e=>setDomain(e.target.value)} placeholder="github.com" /></div>
        <div className="field"><label>URL</label><input className="input" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://github.com" /></div>
        <div className="field"><label>Identifiant</label><input className="input" value={username} onChange={e=>setUsername(e.target.value)} placeholder="vous@domaine.com" required /></div>
        <div className="field"><label>Mot de passe</label><input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required /></div>
        <div className="field"><label>Tags</label><input className="input" value={tags} onChange={e=>setTags(e.target.value)} placeholder="Pro, Dev" /></div>
        <div className="field"><label className="checkline"><input type="checkbox" checked={has2FA} onChange={e=>setHas2FA(e.target.checked)} /> 2FA activé</label></div>
        <div className="row right mt-12"><button className="btn primary" disabled={!canSave || saving}>{saving?'...':'Enregistrer'}</button></div>
      </form>
    </div>
  )
}

export default Dashboard
