"use client"

import Link from "next/link"

export default function BacklogError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="board-route-error">
      <span>Falha de leitura</span>
      <h1>O quadro não pôde ser carregado</h1>
      <p>Os arquivos canônicos não foram alterados. Tente novamente ou verifique a integridade do workspace.</p>
      <div><button className="button primary" onClick={reset} type="button">Tentar novamente</button><Link className="button" href="/projects">Voltar aos projetos</Link></div>
    </main>
  )
}
