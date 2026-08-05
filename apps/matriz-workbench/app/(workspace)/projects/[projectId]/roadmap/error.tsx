"use client"

export default function RoadmapError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="route-state" role="alert">
      <span className="error-mark" aria-hidden="true">!</span>
      <h1>Não foi possível abrir o roadmap</h1>
      <p>O arquivo pode ter mudado ou estar temporariamente indisponível.</p>
      <button className="button primary" onClick={() => reset()} type="button">Tentar novamente</button>
    </main>
  )
}
