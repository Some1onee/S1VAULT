export type User = { id: number; email: string; masterSalt: string; totpEnabled: boolean }
export type VaultEntry = {
  id: number
  userId: number
  title: string
  domain?: string|null
  url?: string|null
  tags?: string|null
  favorite: boolean
  has2FA: boolean
  strength: number
  lastUsedAt?: string|null
  cipherText: string
  iv: string
  secretFingerprint?: string|null
  createdAt: string
  updatedAt: string
}

async function http(path: string, init: RequestInit = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(init.headers||{}) },
    credentials: 'include',
    ...init,
  })
  const isJson = res.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await res.json() : await res.text()
  if (!res.ok) throw new Error((data && data.error) || res.statusText)
  return data
}

export const api = {
  async register(email: string, password: string): Promise<{ user: User, recoveryCodes: string[] } & any> {
    const data = await http('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) })
    const user: User = { id: data.id, email: data.email, masterSalt: data.masterSalt, totpEnabled: data.totpEnabled }
    return { user, recoveryCodes: data.recoveryCodes || [] }
  },
  async login(email: string, password: string, totp?: string, recoveryCode?: string): Promise<{ user?: User, mfaRequired?: boolean } & any> {
    const data = await http('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password, totp, recoveryCode }) })
    if (data.mfaRequired) return { mfaRequired: true }
    const user: User = { id: data.id, email: data.email, masterSalt: data.masterSalt, totpEnabled: data.totpEnabled }
    return { user }
  },
  async logout(): Promise<void> { await http('/api/auth/logout', { method: 'POST' }) },
  async me(): Promise<User|null> {
    const data = await http('/api/auth/me')
    if (!data.user) return null
    return data.user as User
  },

  async listEntries(): Promise<VaultEntry[]> { return await http('/api/vault/entries') },
  async getEntry(id: number): Promise<VaultEntry> { return await http(`/api/vault/entries/${id}`) },
  async createEntry(payload: Partial<VaultEntry> & { title: string, cipherText: string, iv: string }): Promise<VaultEntry> {
    return await http('/api/vault/entries', { method: 'POST', body: JSON.stringify(payload) })
  },
  async updateEntry(id: number, payload: Partial<VaultEntry>): Promise<VaultEntry> {
    return await http(`/api/vault/entries/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
  },
  async deleteEntry(id: number): Promise<void> { await http(`/api/vault/entries/${id}`, { method: 'DELETE' }) },
  async touchEntry(id: number): Promise<VaultEntry> { return await http(`/api/vault/entries/${id}/touch`, { method: 'POST' }) },

  async securitySummary(): Promise<{ weak: number, reused: number, old180d: number, no2FA: number, total: number }>{
    return await http('/api/security/summary')
  },
  async securityProblems(): Promise<Array<any>> { return await http('/api/security/problems') },

  // TOTP
  async totpSetup(): Promise<{ secret: string, otpauth: string }>{
    return await http('/api/auth/totp/setup', { method: 'POST' })
  },
  async totpEnable(code: string): Promise<{ enabled: boolean, recoveryCodes: string[] }>{
    return await http('/api/auth/totp/enable', { method: 'POST', body: JSON.stringify({ code }) })
  },
  async regenerateRecoveryCodes(): Promise<{ recoveryCodes: string[] }>{
    return await http('/api/auth/recovery/regenerate', { method: 'POST' })
  },
}
