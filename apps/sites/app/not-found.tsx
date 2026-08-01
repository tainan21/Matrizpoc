import Link from "next/link"

export default function NotFound() {
  return (
    <main className="not-found">
      <p className="eyebrow">404 · configuração não encontrada</p>
      <h1>Este site ainda não pertence ao catálogo.</h1>
      <Link href="/">Voltar ao Matriz Sites</Link>
    </main>
  )
}
