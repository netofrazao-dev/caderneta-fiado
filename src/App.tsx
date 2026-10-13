import { useEffect, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Home from './pages/Home'
import ClientePage from './pages/Cliente'
import Lixeira from './pages/Lixeira'
import Agenda from './pages/Agenda'
import NovaSenha from './pages/NovaSenha'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [recuperando, setRecuperando] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setCarregando(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((evento, s) => {
      setSession(s)
      if (evento === 'PASSWORD_RECOVERY') setRecuperando(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  if (carregando) return <p className="aviso">Carregando…</p>
  if (!session) return <Login />
  if (recuperando) return <NovaSenha onPronto={() => setRecuperando(false)} />

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/cliente/:id" element={<ClientePage />} />
      <Route path="/lixeira" element={<Lixeira />} />
      <Route path="/agenda" element={<Agenda />} />
    </Routes>
  )
}
