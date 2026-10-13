import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Cliente, Lancamento } from '../types'
import { brl, dataHora } from '../lib/format'

type ItemApagado = Lancamento & { apagado_em: string; clientes: { nome: string } }

export default function Lixeira() {
  const nav = useNavigate()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [itens, setItens] = useState<ItemApagado[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    // limpeza: o que foi apagado há mais de 30 dias some de vez
    const corte = new Date(Date.now() - 30 * 86400000).toISOString()
    await supabase.from('lancamentos').delete().lt('apagado_em', corte)
    await supabase.from('clientes').delete().lt('apagado_em', corte)

    const [c, l] = await Promise.all([
      supabase.from('clientes').select('*').not('apagado_em', 'is', null).order('apagado_em', { ascending: false }),
      supabase
        .from('lancamentos')
        .select('*, clientes!inner(nome, apagado_em)')
        .not('apagado_em', 'is', null)
        .is('clientes.apagado_em', null)
        .order('apagado_em', { ascending: false }),
    ])
    if (c.error || l.error) setErro('Não deu para carregar. Confira a internet.')
    else {
      setClientes((c.data ?? []) as Cliente[])
      setItens(((l.data ?? []) as unknown as ItemApagado[]).map((x) => ({ ...x, valor: Number(x.valor) })))
    }
    setCarregando(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function recuperar(tabela: 'clientes' | 'lancamentos', id: string) {
    const { error } = await supabase.from(tabela).update({ apagado_em: null }).eq('id', id)
    if (error) setErro('Não deu para recuperar. Tente de novo.')
    else carregar()
  }

  const vazio = !carregando && clientes.length === 0 && itens.length === 0

  return (
    <main className="pagina">
      <button className="voltar" onClick={() => nav('/')}>← Voltar</button>
      <h1>Lixeira</h1>
      <p className="sub">O que você apaga fica aqui por 30 dias. Depois some de vez.</p>

      {erro && <p className="erro">{erro}</p>}
      {carregando && <p className="aviso">Carregando…</p>}
      {vazio && !erro && <p className="aviso">A lixeira está vazia.</p>}

      {clientes.length > 0 && <h2>Clientes apagados</h2>}
      <ul className="lista">
        {clientes.map((c) => (
          <li key={c.id} className="item">
            <div className="item-info">
              <span className="desc">{c.nome}</span>
              <span className="data">Apagado em {dataHora(c.apagado_em as string)}</span>
            </div>
            <button className="btn btn-verde recuperar" onClick={() => recuperar('clientes', c.id)}>Recuperar</button>
          </li>
        ))}
      </ul>

      {itens.length > 0 && <h2>Anotações apagadas</h2>}
      <ul className="lista">
        {itens.map((l) => (
          <li key={l.id} className={`item ${l.tipo}`}>
            <div className="item-info">
              <span className="desc">{l.clientes.nome}</span>
              <span className="data">{dataHora(l.data_hora)}</span>
              <span>{l.descricao || (l.tipo === 'pagamento' ? 'Pagamento' : 'Compra')} — {brl(l.valor)}</span>
            </div>
            <button className="btn btn-verde recuperar" onClick={() => recuperar('lancamentos', l.id)}>Recuperar</button>
          </li>
        ))}
      </ul>
    </main>
  )
}
