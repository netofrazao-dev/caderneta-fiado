const NIVEIS = [17, 20, 23, 26]
const CHAVE = 'fiado-fonte'

export const maxNivel = NIVEIS.length - 1

export function nivelAtual(): number {
  try {
    const v = localStorage.getItem(CHAVE)
    const n = Number(v)
    return v !== null && n >= 0 && n <= maxNivel ? n : 1
  } catch {
    return 1
  }
}

export function aplicarFonte(n: number) {
  document.documentElement.style.fontSize = `${NIVEIS[n]}px`
  try {
    localStorage.setItem(CHAVE, String(n))
  } catch {
    /* sem armazenamento: só não lembra a escolha */
  }
}
