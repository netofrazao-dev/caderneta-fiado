export type TipoPix = 'cpf_cnpj' | 'celular' | 'email' | 'aleatoria'
export type PixConfig = { chave: string; tipo: TipoPix; nome: string; cidade: string }

export const rotuloTipo = (t: TipoPix) =>
  ({ cpf_cnpj: 'CPF/CNPJ', celular: 'celular', email: 'e-mail', aleatoria: 'chave aleatória' })[t]

// Chave no formato que o Pix exige dentro do QR Code
export function chaveNormalizada(tipo: TipoPix, chave: string): string {
  const t = chave.trim()
  if (tipo === 'cpf_cnpj') return t.replace(/\D/g, '')
  if (tipo === 'celular') {
    let d = t.replace(/\D/g, '')
    if (d.startsWith('55') && d.length > 11) d = d.slice(2)
    return `+55${d}`
  }
  return t.toLowerCase()
}

export function validarChave(tipo: TipoPix, chave: string): string | null {
  if (!chave.trim()) return 'Escreva a chave Pix.'
  const n = chaveNormalizada(tipo, chave)
  if (tipo === 'cpf_cnpj' && !(n.length === 11 || n.length === 14)) return 'CPF tem 11 números e CNPJ tem 14.'
  if (tipo === 'celular' && !/^\+55\d{10,11}$/.test(n)) return 'Escreva o celular com DDD. Ex.: 91 99999-9999'
  if (tipo === 'email' && !/^\S+@\S+\.\S+$/.test(n)) return 'Escreva um e-mail válido.'
  if (tipo === 'aleatoria' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(n))
    return 'A chave aleatória é parecida com 123e4567-e89b-12d3-a456-426614174000.'
  return null
}

const limpa = (s: string, max: number) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .trim()
    .slice(0, max)

const tlv = (id: string, v: string) => id + String(v.length).padStart(2, '0') + v

export function crc16(s: string): string {
  let crc = 0xffff
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

// Pix "copia e cola" / QR Code estático (sem valor: o cliente digita quanto vai pagar)
export function pixPayload(p: PixConfig): string {
  const conta = tlv('00', 'BR.GOV.BCB.PIX') + tlv('01', chaveNormalizada(p.tipo, p.chave))
  const base =
    tlv('00', '01') +
    tlv('01', '11') +
    tlv('26', conta) +
    tlv('52', '0000') +
    tlv('53', '986') +
    tlv('58', 'BR') +
    tlv('59', limpa(p.nome, 25) || 'RECEBEDOR') +
    tlv('60', limpa(p.cidade, 15) || 'BRASIL') +
    tlv('62', tlv('05', '***')) +
    '6304'
  return base + crc16(base)
}
