"use client"

import { SurfaceState } from "../src/ui/environment/SurfaceState"

export default function ErrorBoundary({
  error,
  reset,
}: {
  readonly error: Error & { readonly digest?: string }
  readonly reset: () => void
}) {
  return (
    <SurfaceState
      action={{ label: "Tentar novamente", onClick: reset }}
      aside={error.digest ? <small>Referência: {error.digest}</small> : undefined}
      description="A área não pôde concluir a leitura. Os dados existentes não foram substituídos nem simulados."
      kind="error"
      title="Não foi possível abrir esta área"
    />
  )
}
