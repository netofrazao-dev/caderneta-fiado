import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { lerValor, paraInputLocal } from '../lib/format'
import type { Lancamento } from '../types'

export default function LancamentoForm({ clienteId, tipo, lancamento, onSaved, onCancel }: { clienteId: string; tipo: 'compra' | 'pagamento'; lancamento?: Lancamento; onSaved: () => void; onCancel: () => void }) {
  const [descricao, setDescricao] = useState(lancamento?.descricao ?? '')
  const [valor, setValor] = useState(lancamento ? String(lancamento.valor).replace('.', ',') : '')
  const [quando, setQuando] = useState(paraInputLocal(new Date(lancamento?.data_hora ?? Date.now())))
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const compra = tipo === 'compra'

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    const v = lerValor(valor)
    if (!v || v <= 0) {
      setErro('Escreva o valor. Ex.: 25,50')
      return
    }
    if (compra && !descricao.trim()) {
      setErro('Escreva o que o cliente levou.')
      return
    }
    setSalvando(true)
    setErro('')
    const dados = {
      tipo,
      descricao: descricao.trim() || (compra ? null : 'Pagamento'),
      valor: v,
      data_hora: new Date(quando).toISOString(),
    }
    const { error } = lancamento
      ? await supabase.from('lancamentos').update(dados).eq('id', lancamento.id)
      : await supabase.from('lancamentos').insert({ ...dados, cliente_id: clienteId })
    setSalvando(false)
    if (error) {
      setErro('Não deu para salvar. Confira a internet e tente de novo.')
      return
    }
    onSaved()
  }

  return (
    <form onSubmit={salvar}>
      <label>{compra ? 'O que o cliente levou?' : 'Observação (se quiser)'}</label>
      <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder={compra ? 'Ex.: 2 kg de arroz e 1 óleo' : 'Ex.: pagou em dinheiro'} autoFocus />
      <label>{compra ? 'Valor total (R$)' : 'Quanto ele pagou (R$)'}</label>
      <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" placeholder="0,00" />
      <label>Data e hora</label>
      <input type="datetime-local" value={quando} onChange={(e) => setQuando(e.target.value)} />
      {erro && <p className="erro">{erro}</p>}
      <div className="linha-botoes">
        <button type="button" className="btn btn-claro" onClick={onCancel}>Cancelar</button>
        <button type="submit" className={`btn ${compra ? 'btn-vermelho' : 'btn-verde'}`} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
      </div>
    </form>
  )
}
