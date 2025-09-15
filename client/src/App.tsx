import React, { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { api } from './lib/api'
import { ToastProvider, useToasts } from './components/Toast'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import EntryDetail from './pages/EntryDetail'
import Generator from './pages/Generator'
import SecurityCenter from './pages/SecurityCenter'
import { deriveMasterKey } from './lib/crypto'

export type User = { id: number; email: string; masterSalt: string; totpEnabled: boolean }

export type AuthState = {
  user: User | null
  masterKey: CryptoKey | null
}

const AppShell: React.FC<{ children: React.ReactNode, auth: AuthState, onLogout: () => Promise<void>, theme: 'dark'|'light', onToggleTheme: () => void }> = ({ children, auth, onLogout, theme, onToggleTheme }) => {
  const nav = useNavigate()
  const { push } = useToasts()
  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="logo"><span className="accent">S1</span>VAULT</div>
        <div className="spacer" />
        <button className="btn ghost" onClick={onToggleTheme} aria-label="Basculer le thème">{theme === 'dark' ? '☀️ Mode clair' : '🌙 Mode sombre'}</button>
        {auth.user && (
          <div className="userbox">
            <span className="muted">{auth.user.email}</span>
            <button className="btn" onClick={async ()=>{ await onLogout(); push('Déconnecté'); nav('/login') }}>Déconnexion</button>
          </div>
        )}
      </div>
      <div className="layout">
        <aside className="sidebar">
          <nav>
            <Link to="/" className="nav-item">Tableau de bord</Link>
            <Link to="/generator" className="nav-item">Générateur</Link>
            <Link to="/security" className="nav-item">Centre de sécurité</Link>
          </nav>
        </aside>
        <main className="content">{children}</main>
      </div>
    </div>
  )
}

const Protected: React.FC<{ children: React.ReactNode, authed: boolean }> = ({ children, authed }) => {
  if (!authed) return <Navigate to="/login" replace />
  return <>{children}</>
}

const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>({ user: null, masterKey: null })
  const [theme, setTheme] = useState<'dark'|'light'>(() => (localStorage.getItem('theme') as 'dark'|'light') || 'dark')
  const { push } = useToasts()

  useEffect(() => {
    api.me().then(async (u) => {
      if (u) {
        // On refresh we cannot derive masterKey (we don't have password). Keep user only.
        setAuth({ user: u, masterKey: null })
      }
    })
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  const handleLogin = async (user: User, password: string) => {
    const key = await deriveMasterKey(password, user.masterSalt)
    setAuth({ user, masterKey: key })
  }

  const handleLogout = async () => {
    await api.logout();
    setAuth({ user: null, masterKey: null })
  }

  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={<Login onLoggedIn={handleLogin} theme={theme} onToggleTheme={toggleTheme} />} />
        <Route path="/register" element={<Register onRegistered={handleLogin} theme={theme} onToggleTheme={toggleTheme} />} />
        <Route path="/" element={<AppShell auth={auth} onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme}>
          <Protected authed={!!auth.user}>
            <Dashboard auth={auth} />
          </Protected>
        </AppShell>} />
        <Route path="/entry/:id" element={<AppShell auth={auth} onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme}>
          <Protected authed={!!auth.user}>
            <EntryDetail auth={auth} />
          </Protected>
        </AppShell>} />
        <Route path="/generator" element={<AppShell auth={auth} onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme}>
          <Protected authed={!!auth.user}>
            <Generator />
          </Protected>
        </AppShell>} />
        <Route path="/security" element={<AppShell auth={auth} onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme}>
          <Protected authed={!!auth.user}>
            <SecurityCenter />
          </Protected>
        </AppShell>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </ToastProvider>
  )
}

export default App
