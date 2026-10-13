import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, NOME_LOJA } from '../lib/supabase'
import type { ClienteSaldo } from '../types'
import { brl, dataCurta } from '../lib/format'
import { agrupar, situacao } from '../lib/vencimento'
import { baixarBackup } from '../lib/backup'
import { aplicarFonte, maxNivel, nivelAtual } from '../lib/fonte'
import Modal from '../components/Modal'
import ClienteForm from '../components/ClienteForm'

export default function Home() {
  const nav = useNavigate()
  const [clientes, setClientes] = useState<ClienteSaldo[]>([])
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<'todos' | 'devendo' | 'atrasados'>('todos')
  const [ordem, setOrdem] = useState<'divida' | 'nome'>('divida')
  const [novo, setNovo] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [nivel, setNivel] = useState(nivelAtual())
  const [baixando, setBaixando] = useState(false)
  const [msg, setMsg] = useState('')

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('clientes_saldo').select('*').order('nome')
    if (error) setErro('Não deu para carregar. Confira a internet.')
    else setClientes(((data ?? []) as ClienteSaldo[]).map((c) => ({ ...c, saldo: Number(c.saldo) })))
    setCarregando(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const total = useMemo(() => clientes.reduce((s, c) => s + Math.max(c.saldo, 0), 0), [clientes])

  const ag = useMemo(() => agrupar(clientes), [clientes])
  const qtdAgenda = ag.atrasados.length + ag.hoje.length + ag.semana.length
  const temDias = clientes.some((c) => c.dia_pagamento && c.saldo > 0)

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase()
    const l = clientes.filter((c) => c.nome.toLowerCase().includes(q) &&
        (filtro === 'todos' ||
          (filtro === 'devendo' ? c.saldo > 0 : situacao(c.dia_pagamento, c.saldo, c.ultimo_pagamento, c.primeira_compra)?.tipo === 'atrasado'))
    )
    return l.sort((a, b) => {
      if (ordem === 'divida') {
        const da = a.saldo > 0 ? 1 : 0
        const db = b.saldo > 0 ? 1 : 0
        if (da !== db) return db - da
        if (da && a.saldo !== b.saldo) return b.saldo - a.saldo
      }
      return a.nome.localeCompare(b.nome, 'pt-BR')
    })
  }, [clientes, busca, filtro, ordem])

  function mudarFonte(delta: number) {
    const n = Math.min(maxNivel, Math.max(0, nivel + delta))
    setNivel(n)
    aplicarFonte(n)
  }

  async function copia() {
    setBaixando(true)
    setMsg('')
    try {
      await baixarBackup()
      setMsg('Cópia baixada. Guarde o arquivo em um lugar seguro.')
    } catch {
      setMsg('Não deu para baixar a cópia. Confira a internet.')
    }
    setBaixando(false)
  }

  return (
    <main className="pagina">
      <header className="topo">
        <div>
          <h1>Caderneta do Fiado</h1>
          <p className="sub">{NOME_LOJA}</p>
        </div>
        <div className="topo-dir">
          <button className="sair" onClick={() => supabase.auth.signOut()}>Sair</button>
          <div className="fonte">
            <button aria-label="Diminuir a letra" onClick={() => mudarFonte(-1)} disabled={nivel === 0}>A−</button>
            <button aria-label="Aumentar a letra" onClick={() => mudarFonte(1)} disabled={nivel === maxNivel}>A+</button>
          </div>
        </div>
      </header>

      <section className="total">
        <span>Total que os clientes devem</span>
        <strong>{brl(total)}</strong>
      </section>

      <button className="btn btn-azul grande" onClick={() => setNovo(true)}>+ Novo cliente</button>

      {temDias && (
        <button className="btn btn-claro grande" onClick={() => nav('/agenda')}>
          Quem paga esta semana{qtdAgenda > 0 ? ` (${qtdAgenda})` : ''}
        </button>
      )}

      {clientes.length > 0 && (
        <input className="busca" placeholder="Procurar cliente pelo nome" value={busca} onChange={(e) => setBusca(e.target.value)} />
      )}

      {clientes.length > 1 && (
        <div className="filtros">
          <div className="seg" role="group" aria-label="Mostrar">
            <button className={filtro === 'todos' ? 'on' : ''} onClick={() => setFiltro('todos')}>Todos</button>
            <button className={filtro === 'devendo' ? 'on' : ''} onClick={() => setFiltro('devendo')}>Só devendo</button>
            <button className={filtro === 'atrasados' ? 'on' : ''} onClick={() => setFiltro('atrasados')}>Atrasados</button>
          </div>
          <div className="seg" role="group" aria-label="Ordenar">
            <button className={ordem === 'divida' ? 'on' : ''} onClick={() => setOrdem('divida')}>Maior dívida</button>
            <button className={ordem === 'nome' ? 'on' : ''} onClick={() => setOrdem('nome')}>Nome A–Z</button>
          </div>
        </div>
      )}

      {erro && <p className="erro">{erro}</p>}
      {carregando && <p className="aviso">Carregando…</p>}
      {!carregando && clientes.length === 0 && !erro && (
        <p className="aviso">Nenhum cliente ainda. Toque em “Novo cliente” para começar.</p>
      )}
      {!carregando && clientes.length > 0 && lista.length === 0 && (
        <p className="aviso">{!busca && filtro === 'devendo' ? 'Ninguém está devendo. 🎉' : !busca && filtro === 'atrasados' ? 'Ninguém passou do dia de pagar.' : 'Nenhum cliente encontrado.'}</p>
      )}

      <ul className="lista">
        {lista.map((c) => {
          const deve = c.saldo > 0
          const sit = situacao(c.dia_pagamento, c.saldo, c.ultimo_pagamento, c.primeira_compra)
          return (
            <li key={c.id}>
              <button className="cartao" onClick={() => nav(`/cliente/${c.id}`)}>
                <span className="nome">{c.nome}</span>
                <span className={deve ? 'valor deve' : 'valor ok'}>{deve ? brl(c.saldo) : 'Em dia'}</span>
                {sit && <span className={`sit ${sit.tipo}`}>{sit.texto}</span>}
                {c.ultima_movimentacao && <span className="data">Última anotação: {dataCurta(c.ultima_movimentacao)}</span>}
              </button>
            </li>
          )
        })}
      </ul>

      {!carregando && clientes.length > 0 && (
        <section className="copia">
          <p className="sub">Guarde uma cópia de todos os clientes e anotações em planilha, para ter segurança.</p>
          <button className="btn btn-claro" onClick={copia} disabled={baixando}>{baixando ? 'Preparando…' : 'Baixar cópia dos dados'}</button>
          {msg && <p className="aviso">{msg}</p>}
          <button className="link" onClick={() => nav('/lixeira')}>Lixeira (recuperar o que foi apagado)</button>
        </section>
      )}

      {novo && (
        <Modal titulo="Novo cliente" onClose={() => setNovo(false)}>
          <ClienteForm
            onCancel={() => setNovo(false)}
            onSaved={() => {
              setNovo(false)
              carregar()
            }}
          />
        </Modal>
      )}
    </main>
  )
}
