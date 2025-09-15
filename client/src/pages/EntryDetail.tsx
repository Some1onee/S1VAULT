import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api, type VaultEntry } from '../lib/api'
import type { AuthState } from '../App'
import { decryptJson } from '../lib/crypto'
import { useToasts } from '../components/Toast'

const EntryDetail: React.FC<{ auth: AuthState }> = ({ auth }) => {
  const { id } = useParams()
  const [entry, setEntry] = useState<VaultEntry | null>(null)
  const [secret, setSecret] = useState<{ username?: string; password?: string } | null>(null)
  const { push } = useToasts()

  useEffect(() => {
    (async () => {
      try {
        const e = await api.getEntry(Number(id))
        setEntry(e)
        if (auth.masterKey) {
          try {
            const sec = await decryptJson(e.cipherText, e.iv, auth.masterKey)
            setSecret(sec)
          } catch { setSecret(null) }
        }
      } catch (e: any) { push(e.message, 'error') }
    })()
  }, [id, auth.masterKey])

  const touch = async () => {
    if (!entry) return
    const updated = await api.touchEntry(entry.id)
    setEntry(updated)
    push('Utilisation enregistrée')
  }

  if (!entry) return <div className="card">Chargement…</div>

  return (
    <div className="page">
      <div className="card">
        <div className="row"><Link className="btn" to="/">← Retour</Link></div>
        <h2>{entry.title}</h2>
        <div className="small muted">{entry.domain || entry.url || ''}</div>
        <div className="grid cols-2 mt-12">
          <div className="field"><label>Identifiant</label><input className="input" readOnly value={secret?.username || ''} /></div>
          <div className="field"><label>Mot de passe</label><input className="input" type="password" readOnly value={secret?.password || ''} /></div>
        </div>
        {!auth.masterKey && <div className="small muted">Reconnectez‑vous pour déchiffrer.</div>}
        <div className="row right mt-12">
          <button className="btn" onClick={touch}>Marquer comme utilisé</button>
        </div>
      </div>
      <div className="card">
        <h3>Méta</h3>
        <div className="small">Force: <span className={`badge ${entry.strength<40?'weak':entry.strength<70?'medium':'strong'}`}>{entry.strength}</span></div>
        <div className="small">2FA: {entry.has2FA? 'Oui':'Non'}</div>
        <div className="small">Dernière utilisation: {entry.lastUsedAt ? new Date(entry.lastUsedAt).toLocaleString() : '—'}</div>
        <div className="small muted">Création: {new Date(entry.createdAt).toLocaleString()}</div>
      </div>
    </div>
  )
}
export default EntryDetail
