import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Cliente } from '../types'

export default function ClienteForm({ cliente, onSaved, onCancel }: { cliente?: Cliente; onSaved: () => void; onCancel: () => void }) {
  const [nome, setNome] = useState(cliente?.nome ?? '')
  const [telefone, setTelefone] = useState(cliente?.telefone ?? '')
  const [obs, setObs] = useState(cliente?.observacao ?? '')
  const [dia, setDia] = useState(cliente?.dia_pagamento ? String(cliente.dia_pagamento) : '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) {
      setErro('Escreva o nome do cliente.')
      return
    }
    const d = dia.trim() ? parseInt(dia, 10) : null
    if (d !== null && (isNaN(d) || d < 1 || d > 31)) {
      setErro('O dia de pagar tem que ser de 1 a 31.')
      return
    }
    setSalvando(true)
    setErro('')
    const dados = { nome: nome.trim(), telefone: telefone.trim() || null, observacao: obs.trim() || null, dia_pagamento: d }
    const { error } = cliente
      ? await supabase.from('clientes').update(dados).eq('id', cliente.id)
      : await supabase.from('clientes').insert(dados)
    setSalvando(false)
    if (error) {
      setErro('Não deu para salvar. Confira a internet e tente de novo.')
      return
    }
    onSaved()
  }

  return (
    <form onSubmit={salvar}>
      <label>Nome do cliente</label>
      <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Dona Maria" autoFocus />
      <label>WhatsApp (com DDD)</label>
      <input value={telefone} onChange={(e) => setTelefone(e.target.value)} inputMode="tel" placeholder="Ex.: 91 99999-9999" />
      <label>Dia do mês em que ele acerta a conta (1 a 31)</label>
      <input value={dia} onChange={(e) => setDia(e.target.value)} inputMode="numeric" placeholder="Ex.: 15" />
      <label>Anotação (se quiser)</label>
      <input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: mora perto da igreja" />
      {erro && <p className="erro">{erro}</p>}
      <div className="linha-botoes">
        <button type="button" className="btn btn-claro" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn-azul" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
      </div>
    </form>
  )
}
