import Link from "next/link"

export default function NotFound() {
  return (
    <main className="center-state">
      <p className="eyebrow">404</p>
      <h1>Este item não existe.</h1>
      <p className="muted">Ele pode ter sido movido, arquivado ou nunca inicializado.</p>
      <Link className="button primary" href="/projects">Voltar aos projetos</Link>
    </main>
  )
}
