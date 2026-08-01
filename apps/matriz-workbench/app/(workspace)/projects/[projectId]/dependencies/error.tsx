"use client"

export default function DependenciesError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="route-error-state" role="alert">
      <span>Dependências</span>
      <h1>Não foi possível montar o mapa</h1>
      <p>Os arquivos permanecem intactos. Tente reler o estado persistido.</p>
      <button onClick={() => reset()} type="button">Tentar novamente</button>
    </main>
  )
}
