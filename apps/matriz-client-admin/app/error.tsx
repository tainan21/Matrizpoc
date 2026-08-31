"use client"
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) { return <main className="route-error" role="alert"><span aria-hidden="true">◇</span><h1>Esta área não pôde ser exibida.</h1><p>As outras áreas continuam disponíveis.</p><button onClick={reset}>Tentar novamente</button></main> }
