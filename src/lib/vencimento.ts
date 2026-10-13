import type { ClienteSaldo } from '../types'

export type Situacao = { tipo: 'hoje' | 'breve' | 'atrasado' | 'ok'; texto: string }

function dataDoDia(ano: number, mes: number, dia: number) {
  const base = new Date(ano, mes, 1)
  const ultimo = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate()
  return new Date(base.getFullYear(), base.getMonth(), Math.min(dia, ultimo))
}

/**
 * Situação do cliente em relação ao dia de pagar dele.
 * "Atrasado" = o dia de pagar já passou neste ciclo, ele tinha compras antes dessa data,
 * deve algo e não registrou nenhum pagamento depois dela.
 */
export function situacao(
  dia: number | null,
  saldo: number,
  ultimoPagamento: string | null,
  primeiraCompra: string | null,
  agora = new Date()
): Situacao | null {
  if (!dia || saldo <= 0) return null
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate())

  let passada = dataDoDia(hoje.getFullYear(), hoje.getMonth(), dia)
  if (passada > hoje) passada = dataDoDia(hoje.getFullYear(), hoje.getMonth() - 1, dia)
  if (+passada === +hoje) return { tipo: 'hoje', texto: 'Hoje é o dia de pagar' }

  const semPagar = !ultimoPagamento || new Date(ultimoPagamento) < passada
  if (semPagar && primeiraCompra && new Date(primeiraCompra) < passada) {
    return { tipo: 'atrasado', texto: `Passou do dia de pagar (dia ${dia})` }
  }

  let proxima = dataDoDia(hoje.getFullYear(), hoje.getMonth(), dia)
  if (proxima <= hoje) proxima = dataDoDia(hoje.getFullYear(), hoje.getMonth() + 1, dia)
  const dias = Math.round((+proxima - +hoje) / 86400000)
  if (dias <= 3) return { tipo: 'breve', texto: dias === 1 ? 'Paga amanhã' : `Paga em ${dias} dias` }
  return { tipo: 'ok', texto: `Paga todo dia ${dia}` }
}

// Quantos dias faltam para o próximo dia de pagar (0 = hoje)
export function diasAte(dia: number, agora = new Date()): number {
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate())
  let proxima = dataDoDia(hoje.getFullYear(), hoje.getMonth(), dia)
  if (proxima < hoje) proxima = dataDoDia(hoje.getFullYear(), hoje.getMonth() + 1, dia)
  return Math.round((+proxima - +hoje) / 86400000)
}

export type ItemAgenda = { c: ClienteSaldo; dias: number }

// Separa quem está devendo em: atrasados, paga hoje, paga nos próximos 7 dias
export function agrupar(clientes: ClienteSaldo[], agora = new Date()) {
  const atrasados: ItemAgenda[] = []
  const hoje: ItemAgenda[] = []
  const semana: ItemAgenda[] = []
  for (const c of clientes) {
    if (!c.dia_pagamento || c.saldo <= 0) continue
    const dias = diasAte(c.dia_pagamento, agora)
    const sit = situacao(c.dia_pagamento, c.saldo, c.ultimo_pagamento, c.primeira_compra, agora)
    if (sit?.tipo === 'atrasado') atrasados.push({ c, dias })
    else if (dias === 0) hoje.push({ c, dias })
    else if (dias <= 7) semana.push({ c, dias })
  }
  const porValor = (a: ItemAgenda, b: ItemAgenda) => b.c.saldo - a.c.saldo
  atrasados.sort(porValor)
  hoje.sort(porValor)
  semana.sort((a, b) => a.dias - b.dias || porValor(a, b))
  return { atrasados, hoje, semana }
}
