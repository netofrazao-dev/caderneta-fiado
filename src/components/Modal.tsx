import type { ReactNode } from 'react'

export default function Modal({ titulo, children, onClose }: { titulo: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fundo" onClick={onClose}>
      <div className="janela" onClick={(e) => e.stopPropagation()}>
        <h2>{titulo}</h2>
        {children}
      </div>
    </div>
  )
}
