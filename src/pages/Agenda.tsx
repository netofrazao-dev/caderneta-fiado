import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { ClienteSaldo } from '../types'
import { brl } from '../lib/format'
import { agrupar, type ItemAgenda } from '../lib/vencimento'

export default function Agenda() {
  const nav = useNavigate()
  const [clientes, setClientes] = useState<ClienteSaldo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    supabase
      .from('clientes_saldo')
      .select('*')
      .then(({ data, error }) => {
        if (error) setErro('Não deu para carregar. Confira a internet.')
        else setClientes(((data ?? []) as ClienteSaldo[]).map((c) => ({ ...c, saldo: Number(c.saldo) })))
        setCarregando(false)
      })
  }, [])

  const { atrasados, hoje, semana } = useMemo(() => agrupar(clientes), [clientes])
  const vazio = !carregando && !erro && atrasados.length + hoje.length + semana.length === 0

  function bloco(titulo: string, lista: ItemAgenda[], cor: string, quando: (i: ItemAgenda) => string) {
    if (lista.length === 0) return null
    return (
      <>
        <h2>{titulo} ({lista.length})</h2>
        <ul className="lista">
          {lista.map((i) => (
            <li key={i.c.id}>
              <button className="cartao" onClick={() => nav(`/cliente/${i.c.id}`)}>
                <span className="nome">{i.c.nome}</span>
                <span className="valor deve">{brl(i.c.saldo)}</span>
                <span className={`sit ${cor}`}>{quando(i)}</span>
              </button>
            </li>
          ))}
        </ul>
      </>
    )
  }

  return (
    <main className="pagina">
      <button className="voltar" onClick={() => nav('/')}>← Voltar</button>
      <h1>Quem paga</h1>
      <p className="sub">Clientes que estão devendo, pelo dia de pagar de cada um.</p>

      {erro && <p className="erro">{erro}</p>}
      {carregando && <p className="aviso">Carregando…</p>}
      {vazio && <p className="aviso">Ninguém para cobrar hoje nem nos próximos 7 dias. Para aparecer aqui, o cliente precisa dever e ter o “dia de pagar” preenchido.</p>}

      {bloco('Passaram do dia de pagar', atrasados, 'atrasado', (i) => `Dia de pagar: ${i.c.dia_pagamento}`)}
      {bloco('Pagam hoje', hoje, 'hoje', () => 'Hoje é o dia de pagar')}
      {bloco('Pagam nos próximos 7 dias', semana, 'breve', (i) => (i.dias === 1 ? 'Amanhã (dia ' + i.c.dia_pagamento + ')' : `Em ${i.dias} dias (dia ${i.c.dia_pagamento})`))}
    </main>
  )
}
