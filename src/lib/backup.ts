import { supabase } from './supabase'
import type { Cliente, Lancamento } from '../types'

async function tudo<T>(tabela: string, ordem: string): Promise<T[]> {
  const linhas: T[] = []
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase
      .from(tabela)
      .select('*')
      .is('apagado_em', null)
      .order(ordem)
      .order('id')
      .range(de, de + 999)
    if (error) throw error
    linhas.push(...((data ?? []) as T[]))
    if (!data || data.length < 1000) break
  }
  return linhas
}

const esc = (v: string) => `"${v.replace(/"/g, '""')}"`

// Planilha (CSV) que abre direto no Excel / Google Planilhas, com acentos certos
export async function baixarBackup() {
  const [clientes, lancs] = await Promise.all([
    tudo<Cliente>('clientes', 'nome'),
    tudo<Lancamento>('lancamentos', 'data_hora'),
  ])
  const porId = new Map(clientes.map((c) => [c.id, c]))

  const linhas: string[][] = lancs.map((l) => {
    const c = porId.get(l.cliente_id)
    const d = new Date(l.data_hora)
    return [
      c?.nome ?? '',
      c?.telefone ?? '',
      c?.dia_pagamento ? String(c.dia_pagamento) : '',
      d.toLocaleDateString('pt-BR'),
      d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      l.tipo === 'compra' ? 'Compra' : 'Pagamento',
      l.descricao ?? '',
      Number(l.valor).toFixed(2).replace('.', ','),
    ]
  })

  const comAnotacao = new Set(lancs.map((l) => l.cliente_id))
  clientes.filter((c) => !comAnotacao.has(c.id)).forEach((c) => linhas.push([c.nome, c.telefone ?? '', c.dia_pagamento ? String(c.dia_pagamento) : '', '', '', '', '', '']))
  linhas.sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))

  const cab = ['Cliente', 'WhatsApp', 'Dia de pagar', 'Data', 'Hora', 'Tipo', 'O que levou / observação', 'Valor (R$)']
  const csv = '\uFEFF' + [cab, ...linhas].map((r) => r.map(esc).join(';')).join('\r\n')

  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `fiado-copia-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
