import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, NOME_LOJA } from '../lib/supabase'
import { validarChave, type TipoPix } from '../lib/pix'

const TIPOS: { v: TipoPix; r: string }[] = [
  { v: 'cpf_cnpj', r: 'CPF/CNPJ' },
  { v: 'celular', r: 'Celular' },
  { v: 'email', r: 'E-mail' },
  { v: 'aleatoria', r: 'Aleatória' },
]

export default function Configuracoes() {
  const nav = useNavigate()
  const [tipo, setTipo] = useState<TipoPix>('celular')
  const [chave, setChave] = useState('')
  const [nome, setNome] = useState(NOME_LOJA.slice(0, 25))
  const [cidade, setCidade] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState('')

  useEffect(() => {
    supabase
      .from('configuracoes')
      .select('*')
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) setErro('Não deu para carregar. Confira se o arquivo 003_pix.sql foi rodado no Supabase.')
        else if (data) {
          setTipo((data.tipo_pix as TipoPix) ?? 'celular')
          setChave(data.chave_pix ?? '')
          setNome(data.nome_recebedor ?? NOME_LOJA.slice(0, 25))
          setCidade(data.cidade ?? '')
        }
        setCarregando(false)
      })
  }, [])

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setOk('')
    const e1 = validarChave(tipo, chave)
    if (e1) return setErro(e1)
    if (!nome.trim()) return setErro('Escreva o nome de quem recebe.')
    if (!cidade.trim()) return setErro('Escreva a cidade. Ex.: Breves')
    setSalvando(true)
    setErro('')
    const { data: u } = await supabase.auth.getUser()
    const { error } = await supabase.from('configuracoes').upsert({
      user_id: u.user?.id,
      chave_pix: chave.trim(),
      tipo_pix: tipo,
      nome_recebedor: nome.trim(),
      cidade: cidade.trim(),
      updated_at: new Date().toISOString(),
    })
    setSalvando(false)
    if (error) setErro('Não deu para salvar. Confira a internet e se o arquivo 003_pix.sql foi rodado.')
    else setOk('Pix salvo. Ele já vai aparecer nos próximos PDFs.')
  }

  async function remover() {
    if (!window.confirm('Parar de mostrar o Pix nos PDFs?')) return
    const { data: u } = await supabase.auth.getUser()
    await supabase.from('configuracoes').delete().eq('user_id', u.user?.id ?? '')
    setChave('')
    setCidade('')
    setOk('Pix removido.')
  }

  return (
    <main className="pagina">
      <button className="voltar" onClick={() => nav('/')}>← Voltar</button>
      <h1>Pix para receber</h1>
      <p className="sub">A chave e o QR Code saem no PDF e a chave vai na mensagem do WhatsApp, só para quem está devendo.</p>

      {carregando ? (
        <p className="aviso">Carregando…</p>
      ) : (
        <form onSubmit={salvar}>
          <label>Tipo da chave</label>
          <div className="seg" role="group" aria-label="Tipo da chave">
            {TIPOS.map((t) => (
              <button type="button" key={t.v} className={tipo === t.v ? 'on' : ''} onClick={() => setTipo(t.v)}>{t.r}</button>
            ))}
          </div>
          <label>Chave Pix</label>
          <input value={chave} onChange={(e) => setChave(e.target.value)} inputMode={tipo === 'email' || tipo === 'aleatoria' ? 'email' : 'tel'} placeholder={tipo === 'celular' ? 'Ex.: 91 99999-9999' : tipo === 'cpf_cnpj' ? 'Só os números' : tipo === 'email' ? 'nome@email.com' : 'Cole a chave aleatória'} />
          <label>Nome de quem recebe (como no banco)</label>
          <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={25} />
          <label>Cidade</label>
          <input value={cidade} onChange={(e) => setCidade(e.target.value)} maxLength={15} placeholder="Ex.: Breves" />
          {erro && <p className="erro">{erro}</p>}
          {ok && <p className="aviso">{ok}</p>}
          <div className="linha-botoes" style={{ marginTop: '1.2rem' }}>
            <button className="btn btn-azul grande" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar Pix'}</button>
          </div>
          <button type="button" className="link apagar" onClick={remover}>Remover Pix</button>
        </form>
      )}
    </main>
  )
}
