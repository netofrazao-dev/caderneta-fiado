export const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const brlPdf = (n: number) => brl(n).replace(/\u00a0/g, ' ')

export function dataHora(iso: string) {
  const d = new Date(iso)
  const dia = d.toLocaleDateString('pt-BR')
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${dia} às ${hora}`
}

export function dataCurta(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}

// valor para o campo datetime-local (hora local, sem fuso)
export function paraInputLocal(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

// aceita "12,50", "12.50", "1.250,90"
export function lerValor(txt: string): number {
  const limpo = txt.trim().replace(/[^\d.,]/g, '')
  if (!limpo) return NaN
  const normal = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo
  return Math.round(parseFloat(normal) * 100) / 100
}

// número para o wa.me (adiciona 55 do Brasil se faltar)
export function whatsNumero(tel: string | null) {
  const d = (tel || '').replace(/\D/g, '')
  if (!d) return ''
  return d.startsWith('55') && d.length >= 12 ? d : `55${d}`
}
