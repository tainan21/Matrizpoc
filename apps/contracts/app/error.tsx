"use client"

export default function ErrorBoundary({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main><h1>Não foi possível carregar Contracts.</h1><button type="button" onClick={reset}>Tentar novamente</button></main>
}
