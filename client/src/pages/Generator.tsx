import React, { useMemo, useState } from 'react'
import { useToasts } from '../components/Toast'

function gen(len: number, opts: { U: boolean; L: boolean; D: boolean; S: boolean; ambig: boolean; pronounce: boolean }) {
  if (opts.pronounce) return genPronounceable(len, opts)
  let U = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  let L = 'abcdefghijkmnopqrstuvwxyz'
  let D = '23456789'
  let S = '!@#$%^&*()_-+=[]{}:;,.?'
  if (!opts.ambig) { U += 'IO'; L += 'l'; D += '01'; S += '<>' }
  let pool = ''
  if (opts.U) pool += U; if (opts.L) pool += L; if (opts.D) pool += D; if (opts.S) pool += S
  if (!pool) pool = U + L + D
  let out = ''
  const cryptoOK = (typeof window !== 'undefined') && !!(window.crypto && typeof window.crypto.getRandomValues === 'function')
  for (let i=0;i<len;i++) {
    if (cryptoOK) { const u32 = new Uint32Array(1); window.crypto.getRandomValues(u32); out += pool[u32[0] % pool.length] }
    else out += pool[Math.floor(Math.random()*pool.length)]
  }
  return out
}
function genPronounceable(len: number, _opts: any) {
  const vowels = 'aeiou'
  const cons = 'bcdfghjkmnpqrstvwxyz'
  const choose = (s:string)=>s[Math.floor(Math.random()*s.length)]
  let out = ''
  while (out.length < len) { out += choose(cons) + choose(vowels); if (Math.random()>.5) out += choose(cons) }
  return out.slice(0, len)
}

const Generator: React.FC = () => {
  const [length, setLength] = useState(16)
  const [opts, setOpts] = useState({ U: true, L: true, D: true, S: true, ambig: true, pronounce: false })
  const [outputs, setOutputs] = useState<string[]>([])
  const { push } = useToasts()

  const run = () => {
    const arr = Array.from({length: 5}, ()=> gen(length, opts))
    setOutputs(arr)
    push('Générés')
  }

  return (
    <div className="page">
      <div className="card">
        <h2>Générateur</h2>
        <div className="form-grid">
          <div className="field span-2"><label>Longueur</label><input className="input" type="number" min={8} max={64} value={length} onChange={e=>setLength(parseInt(e.target.value||'16',10))} /></div>
          <div className="field"><label className="checkline"><input type="checkbox" checked={opts.L} onChange={e=>setOpts({...opts, L:e.target.checked})}/> Minuscules</label></div>
          <div className="field"><label className="checkline"><input type="checkbox" checked={opts.D} onChange={e=>setOpts({...opts, D:e.target.checked})}/> Chiffres</label></div>
          <div className="field"><label className="checkline"><input type="checkbox" checked={opts.S} onChange={e=>setOpts({...opts, S:e.target.checked})}/> Symboles</label></div>
          <div className="field"><label className="checkline"><input type="checkbox" checked={opts.ambig} onChange={e=>setOpts({...opts, ambig:e.target.checked})}/> Éviter O/0, l/I</label></div>
          <div className="field"><label className="checkline"><input type="checkbox" checked={opts.pronounce} onChange={e=>setOpts({...opts, pronounce:e.target.checked})}/> Prononçable</label></div>
          <div className="field"><label className="checkline"><input type="checkbox" checked={opts.U} onChange={e=>setOpts({...opts, U:e.target.checked})}/> Majuscules</label></div>
        </div>
        <div className="row right mt-12"><button className="btn primary" onClick={run}>Générer</button></div>
        <ul className="list mt-12">
          {outputs.map((o, i) => (
            <li key={i} className="entry"><span className="mono">{o}</span><button className="btn" onClick={async()=>{ await navigator.clipboard.writeText(o); push('Copié') }}>Copier</button></li>
          ))}
        </ul>
      </div>
    </div>
  )
}
export default Generator
