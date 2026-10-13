export type Cliente = {
  id: string
  nome: string
  telefone: string | null
  observacao: string | null
  dia_pagamento: number | null
  created_at: string
  apagado_em?: string | null
}

export type ClienteSaldo = Cliente & {
  saldo: number
  ultima_movimentacao: string | null
  ultimo_pagamento: string | null
  primeira_compra: string | null
}

export type Lancamento = {
  id: string
  cliente_id: string
  tipo: 'compra' | 'pagamento'
  descricao: string | null
  valor: number
  data_hora: string
  apagado_em?: string | null
}
