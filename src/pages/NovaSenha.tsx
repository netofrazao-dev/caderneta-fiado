import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function NovaSenha({ onPronto }: { onPronto: () => void }) {
  const [senha, setSenha] = useState('')
  const [ver, setVer] = useState(false)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (senha.length < 6) {
      setErro('A senha precisa ter pelo menos 6 letras ou números.')
      return
    }
    setSalvando(true)
    setErro('')
    const { error } = await supabase.auth.updateUser({ password: senha })
    setSalvando(false)
    if (error) setErro('Não deu para salvar a senha. Peça um novo link e tente de novo.')
    else onPronto()
  }

  return (
    <main className="pagina login">
      <h1>Criar nova senha</h1>
      <form onSubmit={salvar}>
        <label>Nova senha</label>
        <input type={ver ? 'text' : 'password'} value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" autoFocus />
        <button type="button" className="link" onClick={() => setVer(!ver)}>{ver ? 'Esconder senha' : 'Mostrar senha'}</button>
        {erro && <p className="erro">{erro}</p>}
        <button className="btn btn-azul grande" style={{ width: '100%', marginTop: '1.2rem' }} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar nova senha'}</button>
      </form>
    </main>
  )
}
