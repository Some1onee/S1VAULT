import React, { createContext, useContext, useState } from 'react'

type Toast = { id: number; text: string; type?: 'success'|'error' }
const Ctx = createContext<{ push: (t: string, type?: Toast['type']) => void }>({ push: ()=>{} })

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<Toast[]>([])
  const push = (text: string, type: Toast['type']='success') => {
    const id = Date.now()
    setItems(prev => [...prev, { id, text, type }])
    setTimeout(() => setItems(prev => prev.filter(t => t.id !== id)), 2000)
  }
  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="toast-stack">
        {items.map(t => <div key={t.id} className={`toast ${t.type||'success'}`}>{t.text}</div>)}
      </div>
    </Ctx.Provider>
  )
}
export const useToasts = () => useContext(Ctx)
