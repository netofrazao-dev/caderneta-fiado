import { useState } from 'react'
import { supabase, NOME_LOJA } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [ver, setVer] = useState(false)
  const [erro, setErro] = useState('')
  const [info, setInfo] = useState('')
  const [entrando, setEntrando] = useState(false)

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setEntrando(true)
    setErro('')
    setInfo('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
    setEntrando(false)
    if (error) setErro('E-mail ou senha incorretos.')
  }

  async function esqueci() {
    setErro('')
    setInfo('')
    if (!email.trim()) {
      setErro('Escreva o seu e-mail no campo acima e toque de novo em “Esqueci minha senha”.')
      return
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin })
    if (error) setErro('Não deu para enviar agora. Tente de novo em alguns minutos.')
    else setInfo('Enviamos um link para o seu e-mail. Abra o e-mail e toque no link para criar uma nova senha.')
  }

  return (
    <main className="pagina login">
      <h1>Caderneta do Fiado</h1>
      <p className="sub">{NOME_LOJA}</p>
      <form onSubmit={entrar}>
        <label>E-mail</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        <label>Senha</label>
        <input type={ver ? 'text' : 'password'} value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" />
        <div className="links">
          <button type="button" className="link" onClick={() => setVer(!ver)}>{ver ? 'Esconder senha' : 'Mostrar senha'}</button>
          <button type="button" className="link" onClick={esqueci}>Esqueci minha senha</button>
        </div>
        {erro && <p className="erro">{erro}</p>}
        {info && <p className="aviso">{info}</p>}
        <button className="btn btn-azul grande" style={{ width: '100%', marginTop: '1.2rem' }} disabled={entrando}>{entrando ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </main>
  )
}
