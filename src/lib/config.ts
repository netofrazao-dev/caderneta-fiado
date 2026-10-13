import { supabase, NOME_LOJA } from './supabase'
import type { PixConfig, TipoPix } from './pix'

// Retorna null se o Pix ainda não foi configurado (ou se a migração 003 ainda não foi rodada)
export async function carregarPix(): Promise<PixConfig | null> {
  const { data, error } = await supabase.from('configuracoes').select('*').maybeSingle()
  if (error || !data || !data.chave_pix || !data.cidade) return null
  return {
    chave: data.chave_pix as string,
    tipo: (data.tipo_pix as TipoPix) ?? 'aleatoria',
    nome: (data.nome_recebedor as string) || NOME_LOJA,
    cidade: data.cidade as string,
  }
}
