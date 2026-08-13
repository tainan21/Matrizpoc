import type { ReactNode } from "react"
import type { HubDataOriginVM, HubStatus } from "./types"

export interface HubStatusPresentation {
  readonly label: string
  readonly symbol: string
}

const STATUS_PRESENTATION = {
  available: { label: "Disponível", symbol: "●" },
  running: { label: "Executando", symbol: "▶" },
  waiting: { label: "Aguardando", symbol: "◷" },
  attention: { label: "Requer atenção", symbol: "△" },
  approval: { label: "Requer aprovação", symbol: "◇" },
  blocked: { label: "Bloqueado", symbol: "■" },
  complete: { label: "Concluído", symbol: "✓" },
  failed: { label: "Falhou", symbol: "×" },
  temporary: { label: "Temporário", symbol: "◌" },
  official: { label: "Oficial", symbol: "◆" },
  archived: { label: "Arquivado", symbol: "▰" },
  planned: { label: "Planejado", symbol: "○" },
  unavailable: { label: "Indisponível", symbol: "—" },
  unknown: { label: "Origem desconhecida", symbol: "?" },
} satisfies Record<HubStatus, HubStatusPresentation>

export function getStatusPresentation(
  status: HubStatus,
): HubStatusPresentation {
  return STATUS_PRESENTATION[status]
}

export function StatusMark({
  status,
  className,
  label,
}: {
  readonly status: HubStatus
  readonly className?: string
  readonly label?: string
}) {
  const presentation = getStatusPresentation(status)
  return (
    <span
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={["hub-status-mark", className].filter(Boolean).join(" ")}
      data-status={status}
    >
      {presentation.symbol}
    </span>
  )
}

export function StatusLabel({
  status,
  children,
  compact = false,
  className,
}: {
  readonly status: HubStatus
  readonly children?: ReactNode
  readonly compact?: boolean
  readonly className?: string
}) {
  const presentation = getStatusPresentation(status)
  return (
    <span
      className={["hub-status-label", className].filter(Boolean).join(" ")}
      data-compact={compact || undefined}
      data-status={status}
    >
      <StatusMark status={status} />
      <span>{children ?? presentation.label}</span>
    </span>
  )
}

const PERSISTENCE_LABELS: Record<HubDataOriginVM["persistence"], string> = {
  process: "Processo atual",
  snapshot: "Snapshot",
  session: "Sessão atual",
  persisted: "Persistido",
  local: "Arquivo local",
}

export function DataOrigin({ origin }: { readonly origin: HubDataOriginVM }) {
  return (
    <div className="hub-data-origin" data-status={origin.status}>
      <StatusMark status={origin.status} />
      <span className="hub-data-origin__copy">
        <strong>{origin.label}</strong>
        <small>{origin.detail}</small>
      </span>
      <span className="hub-data-origin__persistence">
        {PERSISTENCE_LABELS[origin.persistence]}
      </span>
    </div>
  )
}
