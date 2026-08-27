"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { playOperationalSound } from "../../ui/feedback/operational-sounds"

interface RefreshResponse {
  ok: boolean
  replacedAt: string
  accepted: number
  rejected: ReadonlyArray<{ projectIdHint: string; message: string }>
  adapters: ReadonlyArray<{
    adapterId: string
    accepted: number
    failed: number
    durationMs: number
  }>
}

/**
 * Client component: dispara POST /api/institutional/refresh e, em seguida,
 * chama router.refresh() para que todas as RSC que consomem o
 * InstitutionalRegistry re-renderizem com o snapshot novo.
 *
 * L6: UI fina, sem logica de dominio. L4: nao importa integration-* direto.
 */
export function RefreshEcosystemButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<RefreshResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  function onClick() {
    void playOperationalSound("execution")
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch("/api/institutional/refresh", {
          method: "POST",
          headers: { "content-type": "application/json" },
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as RefreshResponse
        setResult(data)
        void playOperationalSound(data.rejected.length || data.adapters.some((adapter) => adapter.failed) ? "attention" : "success")
        router.refresh()
      } catch (err) {
        void playOperationalSound("failure")
        setError(err instanceof Error ? err.message : "unknown error")
      }
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={isPending}
        className="inline-flex items-center gap-2 self-start rounded-md border border-border bg-brand px-3 py-1.5 text-sm font-medium text-brand-fg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Atualizando..." : "Atualizar ecossistema"}
      </button>
      {result && !error ? (
        <p className="text-xs text-surface-fg-muted">
          {`Swap em ${new Date(result.replacedAt).toLocaleTimeString()} — `}
          {`${result.accepted} projetos aceitos em ${result.adapters.length} adapter(s).`}
        </p>
      ) : null}
      {error ? <p className="text-xs text-danger">{`Erro: ${error}`}</p> : null}
    </div>
  )
}
