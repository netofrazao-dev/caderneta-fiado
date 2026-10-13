import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import QRCode from 'qrcode'
import type { Cliente, Lancamento } from '../types'
import { brlPdf, dataHora, whatsNumero } from './format'
import { pixPayload, rotuloTipo, type PixConfig } from './pix'

export type Periodo = { tipo: 'tudo' } | { tipo: 'dias'; dias: number } | { tipo: 'pendente' }

type Logo = { data: string; w: number; h: number } | null
let logoCache: Promise<Logo> | null = null

// Logo opcional: coloque o arquivo em public/logo.png. Se não existir, o PDF sai só com o nome.
export function precarregarLogo(): Promise<Logo> {
  if (!logoCache) {
    logoCache = (async () => {
      try {
        const r = await fetch('/logo.png')
        if (!r.ok || !(r.headers.get('content-type') || '').startsWith('image/')) return null
        const blob = await r.blob()
        const data = await new Promise<string>((res, rej) => {
          const f = new FileReader()
          f.onload = () => res(String(f.result))
          f.onerror = () => rej(new Error('logo'))
          f.readAsDataURL(blob)
        })
        const dim = await new Promise<{ w: number; h: number }>((res, rej) => {
          const i = new Image()
          i.onload = () => res({ w: i.naturalWidth, h: i.naturalHeight })
          i.onerror = () => rej(new Error('logo'))
          i.src = data
        })
        return { data, ...dim }
      } catch {
        return null
      }
    })()
  }
  return logoCache
}

export async function gerarPdf(cliente: Cliente, itens: Lancamento[], loja: string, periodo: Periodo, pix: PixConfig | null = null): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const logo = await precarregarLogo()

  const asc = [...itens].sort((a, b) => +new Date(a.data_hora) - +new Date(b.data_hora))
  let acc = 0
  const todos = asc.map((l) => {
    acc += l.tipo === 'compra' ? l.valor : -l.valor
    return { l, saldo: acc }
  })
  const saldoFinal = acc

  let visiveis = todos
  let anterior = 0
  let rotulo = 'todas as anotações'

  if (periodo.tipo === 'dias') {
    const desde = new Date()
    desde.setDate(desde.getDate() - periodo.dias)
    desde.setHours(0, 0, 0, 0)
    const idx = todos.findIndex((x) => new Date(x.l.data_hora) >= desde)
    visiveis = idx === -1 ? [] : todos.slice(idx)
    anterior = idx === -1 ? saldoFinal : idx > 0 ? todos[idx - 1].saldo : 0
    rotulo = `últimos ${periodo.dias} dias`
  } else if (periodo.tipo === 'pendente') {
    let ini = 0
    todos.forEach((x, i) => {
      if (x.saldo <= 0.004) ini = i + 1
    })
    visiveis = todos.slice(ini)
    rotulo = 'somente o que falta pagar'
  }

  const linhas: string[][] = []
  if (Math.abs(anterior) > 0.004) linhas.push(['', 'Saldo anterior', '', '', brlPdf(anterior)])
  visiveis.forEach(({ l, saldo }) =>
    linhas.push([
      dataHora(l.data_hora),
      l.descricao || (l.tipo === 'pagamento' ? 'Pagamento' : 'Compra'),
      l.tipo === 'compra' ? brlPdf(l.valor) : '',
      l.tipo === 'pagamento' ? brlPdf(l.valor) : '',
      brlPdf(saldo),
    ])
  )

  // Cabeçalho: logo (se houver) + nome do comércio
  let x = 14
  let altura = 0
  if (logo) {
    const k = Math.min(40 / logo.w, 22 / logo.h)
    const w = logo.w * k
    altura = logo.h * k
    doc.addImage(logo.data, 'PNG', 14, 10, w, altura)
    x = 14 + w + 6
  }
  doc.setFontSize(20)
  doc.text(loja, x, 18)
  doc.setFontSize(12)
  doc.text(`Extrato de fiado — ${rotulo}`, x, 26)

  const y0 = Math.max(34, logo ? 10 + altura + 6 : 0)
  doc.setFontSize(12)
  doc.text(`Cliente: ${cliente.nome}`, 14, y0 + 2)
  doc.text(`Emitido em: ${dataHora(new Date().toISOString())}`, 14, y0 + 9)

  autoTable(doc, {
    startY: y0 + 16,
    head: [['Data e hora', 'O que levou', 'Compra', 'Pagamento', 'Saldo']],
    body: linhas,
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [31, 58, 95] },
    columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
  })

  let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12
  if (y > 275) {
    doc.addPage()
    y = 20
  }
  doc.setFontSize(16)
  doc.text(saldoFinal > 0 ? `TOTAL A PAGAR: ${brlPdf(saldoFinal)}` : 'Nenhum valor pendente. Obrigado!', 14, y)

  if (pix && saldoFinal > 0) {
    const qr = await QRCode.toDataURL(pixPayload(pix), { margin: 1, width: 300 })
    if (y + 52 > 285) {
      doc.addPage()
      y = 20
    }
    doc.setFontSize(12)
    doc.text('Pague por Pix', 14, y + 10)
    doc.addImage(qr, 'PNG', 14, y + 14, 38, 38)
    doc.setFontSize(10)
    doc.text(`Chave Pix (${rotuloTipo(pix.tipo)}):`, 58, y + 24)
    doc.setFontSize(12)
    doc.text(pix.chave, 58, y + 31)
    doc.setFontSize(10)
    doc.text(`Recebedor: ${pix.nome}`, 58, y + 38)
    doc.text('Aponte a câmera do app do seu banco para o QR Code.', 58, y + 45)
  }

  return doc.output('blob')
}

export async function compartilharPdf(
  blob: Blob,
  nomeArquivo: string,
  telefone: string | null,
  texto: string
): Promise<'compartilhado' | 'baixado' | 'cancelado'> {
  const file = new File([blob], nomeArquivo, { type: 'application/pdf' })

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: texto })
      return 'compartilhado'
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelado'
    }
  }

  // Plano B (computador): baixa o PDF e abre o WhatsApp com a mensagem
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
  window.open(`https://wa.me/${whatsNumero(telefone)}?text=${encodeURIComponent(texto)}`, '_blank')
  return 'baixado'
}
