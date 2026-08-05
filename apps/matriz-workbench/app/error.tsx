"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="center-state">
      <p className="eyebrow danger">Falha ao carregar</p>
      <h1>O workspace encontrou um estado inválido.</h1>
      <p className="muted">{error.message}</p>
      <button className="button primary" onClick={reset}>Tentar novamente</button>
    </main>
  )
}
