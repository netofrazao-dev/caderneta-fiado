import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase, NOME_LOJA } from '../lib/supabase'
import type { Cliente, Lancamento } from '../types'
import { brl, dataHora } from '../lib/format'
import { situacao } from '../lib/vencimento'
import type { Periodo } from '../lib/pdf'
import { carregarPix } from '../lib/config'
import { rotuloTipo, type PixConfig } from '../lib/pix'
import Modal from '../components/Modal'
import ClienteForm from '../components/ClienteForm'
import LancamentoForm from '../components/LancamentoForm'

export default function ClientePage() {
  const { id } = useParams()
  const nav = useNavigate()
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [itens, setItens] = useState<Lancamento[]>([])
  const [modal, setModal] = useState<'compra' | 'pagamento' | 'editar' | 'item' | 'pdf' | null>(null)
  const [itemEdit, setItemEdit] = useState<Lancamento | null>(null)
  const [pix, setPix] = useState<PixConfig | null>(null)
  const [msg, setMsg] = useState('')
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    const [c, l] = await Promise.all([
      supabase.from('clientes').select('*').eq('id', id).is('apagado_em', null).single(),
      supabase.from('lancamentos').select('*').eq('cliente_id', id).is('apagado_em', null).order('data_hora', { ascending: false }),
    ])
    if (c.error || l.error) {
      setErro('Não deu para carregar. Confira a internet.')
      return
    }
    setCliente(c.data as Cliente)
    setItens(((l.data ?? []) as Lancamento[]).map((x) => ({ ...x, valor: Number(x.valor) })))
  }, [id])

  useEffect(() => {
    carregar()
  }, [carregar])

  // Já deixa o gerador de PDF (e a logo) carregados, para o envio ser instantâneo
  useEffect(() => {
    import('../lib/pdf').then((m) => m.precarregarLogo())
  }, [])

  useEffect(() => {
    carregarPix().then(setPix)
  }, [])

  const saldo = itens.reduce((s, l) => s + (l.tipo === 'compra' ? l.valor : -l.valor), 0)
  const deve = saldo > 0

  async function enviar(periodo: Periodo) {
    if (!cliente) return
    setModal(null)
    setMsg('')
    const { compartilharPdf, gerarPdf } = await import('../lib/pdf')
    const blob = await gerarPdf(cliente, itens, NOME_LOJA, periodo, pix)
    const nome = `fiado-${cliente.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')}.pdf`
    const pixTxt = saldo > 0 && pix ? `\n\nPague por Pix (${rotuloTipo(pix.tipo)}): ${pix.chave}` : ''
    const texto =
      (saldo > 0
        ? `Olá, ${cliente.nome}! Segue o seu extrato de fiado. Total a pagar: ${brl(saldo)}. — ${NOME_LOJA}`
        : `Olá, ${cliente.nome}! Segue o seu extrato de fiado. Não há nada pendente. — ${NOME_LOJA}`) + pixTxt
    const r = await compartilharPdf(blob, nome, cliente.telefone, texto)
    if (r === 'baixado') setMsg('O PDF foi baixado. Anexe ele na conversa do WhatsApp que abriu.')
  }

  async function quitarTudo() {
    if (!cliente || saldo <= 0) return
    const valor = Math.round(saldo * 100) / 100
    if (!window.confirm(`Marcar ${brl(valor)} como pago por ${cliente.nome}?`)) return
    const { error } = await supabase.from('lancamentos').insert({
      cliente_id: cliente.id,
      tipo: 'pagamento',
      descricao: 'Pagamento total',
      valor,
      data_hora: new Date().toISOString(),
    })
    if (error) setMsg('Não deu para salvar. Tente de novo.')
    else carregar()
  }

  async function apagar(l: Lancamento) {
    if (!window.confirm(`Apagar esta anotação de ${brl(l.valor)}?\n\nSe foi sem querer, dá para recuperar na Lixeira por 30 dias.`)) return
    const { error } = await supabase.from('lancamentos').update({ apagado_em: new Date().toISOString() }).eq('id', l.id)
    if (error) setMsg('Não deu para apagar. Tente de novo.')
    else carregar()
  }

  async function apagarCliente() {
    if (!cliente) return
    const aviso =
      itens.length > 0
        ? `Apagar ${cliente.nome} e as ${itens.length} anotações dele?`
        : `Apagar ${cliente.nome}?`
    if (!window.confirm(`${aviso}\n\nSe foi sem querer, dá para recuperar na Lixeira por 30 dias.`)) return
    const { error } = await supabase.from('clientes').update({ apagado_em: new Date().toISOString() }).eq('id', cliente.id)
    if (error) setMsg('Não deu para apagar. Tente de novo.')
    else nav('/')
  }

  if (erro) return <main className="pagina"><p className="erro">{erro}</p><button className="btn btn-claro" onClick={() => nav('/')}>← Voltar</button></main>
  if (!cliente) return <p className="aviso">Carregando…</p>

  const ultimoPag = itens.filter((l) => l.tipo === 'pagamento').map((l) => l.data_hora).sort().pop() ?? null
  const primeiraCompra = itens.filter((l) => l.tipo === 'compra').map((l) => l.data_hora).sort()[0] ?? null
  const sit = situacao(cliente.dia_pagamento, saldo, ultimoPag, primeiraCompra)

  return (
    <main className="pagina">
      <button className="voltar" onClick={() => nav('/')}>← Voltar</button>

      <header className="cliente-topo">
        <h1>{cliente.nome}</h1>
        {cliente.telefone && <p className="sub">WhatsApp: {cliente.telefone}</p>}
        {cliente.dia_pagamento && <p className="sub">Acerta a conta todo dia {cliente.dia_pagamento}</p>}
        {cliente.observacao && <p className="sub">{cliente.observacao}</p>}
        <div className="links">
          <button className="link" onClick={() => setModal('editar')}>Editar dados do cliente</button>
          <button className="link apagar" onClick={apagarCliente}>Apagar cliente</button>
        </div>
      </header>

      <section className={deve ? 'total devendo' : 'total quite'}>
        <span>{deve ? 'Está devendo' : 'Não deve nada'}</span>
        <strong>{brl(Math.max(saldo, 0))}</strong>
      </section>
      {sit && sit.tipo !== 'ok' && <p className={`sit grande-sit ${sit.tipo}`}>{sit.texto}</p>}

      <div className="linha-botoes">
        <button className="btn btn-vermelho grande" onClick={() => setModal('compra')}>+ Anotar compra</button>
        <button className="btn btn-verde grande" onClick={() => setModal('pagamento')}>Recebi pagamento</button>
      </div>
      {deve && (
        <button className="btn btn-contorno grande" onClick={quitarTudo}>
          Quitar tudo ({brl(saldo)})
        </button>
      )}
      <button className="btn btn-whats grande" onClick={() => setModal('pdf')} disabled={itens.length === 0}>
        Enviar PDF no WhatsApp
      </button>
      {msg && <p className="aviso">{msg}</p>}

      <h2>Histórico</h2>
      {itens.length === 0 && <p className="aviso">Nenhuma anotação ainda.</p>}
      <ul className="lista">
        {itens.map((l) => (
          <li key={l.id} className={`item ${l.tipo}`}>
            <div className="item-info">
              <span className="data">{dataHora(l.data_hora)}</span>
              <span className="desc">{l.descricao || (l.tipo === 'pagamento' ? 'Pagamento' : 'Compra')}</span>
              <div className="links">
                <button
                  className="link pequeno"
                  onClick={() => {
                    setItemEdit(l)
                    setModal('item')
                  }}
                >
                  Editar
                </button>
                <button className="link pequeno apagar" onClick={() => apagar(l)}>Apagar</button>
              </div>
            </div>
            <span className="item-valor">{l.tipo === 'compra' ? '+ ' : '− '}{brl(l.valor)}</span>
          </li>
        ))}
      </ul>

      {(modal === 'compra' || modal === 'pagamento') && (
        <Modal titulo={modal === 'compra' ? 'Anotar compra' : 'Receber pagamento'} onClose={() => setModal(null)}>
          <LancamentoForm
            clienteId={cliente.id}
            tipo={modal}
            onCancel={() => setModal(null)}
            onSaved={() => {
              setModal(null)
              carregar()
            }}
          />
        </Modal>
      )}
      {modal === 'item' && itemEdit && (
        <Modal titulo={itemEdit.tipo === 'compra' ? 'Editar compra' : 'Editar pagamento'} onClose={() => setModal(null)}>
          <LancamentoForm
            clienteId={cliente.id}
            tipo={itemEdit.tipo}
            lancamento={itemEdit}
            onCancel={() => setModal(null)}
            onSaved={() => {
              setModal(null)
              carregar()
            }}
          />
        </Modal>
      )}
      {modal === 'editar' && (
        <Modal titulo="Dados do cliente" onClose={() => setModal(null)}>
          <ClienteForm
            cliente={cliente}
            onCancel={() => setModal(null)}
            onSaved={() => {
              setModal(null)
              carregar()
            }}
          />
        </Modal>
      )}
      {modal === 'pdf' && (
        <Modal titulo="O que mandar no PDF?" onClose={() => setModal(null)}>
          <div className="opcoes">
            {deve && <button className="btn btn-azul grande" onClick={() => enviar({ tipo: 'pendente' })}>Só o que falta pagar</button>}
            <button className="btn btn-azul grande" onClick={() => enviar({ tipo: 'dias', dias: 30 })}>Últimos 30 dias</button>
            <button className="btn btn-claro grande" onClick={() => enviar({ tipo: 'tudo' })}>Tudo, desde o começo</button>
            <button className="link" onClick={() => setModal(null)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </main>
  )
}
