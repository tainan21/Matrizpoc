import Link from "next/link"
import type { ReactNode } from "react"
import { HubIcon } from "./icons"

export type SurfaceStateKind =
  | "loading"
  | "empty"
  | "filtered"
  | "partial"
  | "error"
  | "denied"
  | "planned"
  | "unavailable"

export interface SurfaceStateProps {
  readonly kind: SurfaceStateKind
  readonly title: string
  readonly description: string
  readonly action?:
    | { readonly label: string; readonly href: string }
    | { readonly label: string; readonly onClick: () => void }
  readonly aside?: ReactNode
  readonly compact?: boolean
}

const ICONS: Record<SurfaceStateKind, Parameters<typeof HubIcon>[0]["name"]> = {
  loading: "activity",
  empty: "layers",
  filtered: "search",
  partial: "warning",
  error: "warning",
  denied: "user",
  planned: "roadmap",
  unavailable: "close",
}

export function SurfaceState({
  kind,
  title,
  description,
  action,
  aside,
  compact = false,
}: SurfaceStateProps) {
  const role = kind === "error" ? "alert" : kind === "loading" ? "status" : undefined
  return (
    <section
      aria-busy={kind === "loading" || undefined}
      className="hub-surface-state"
      data-compact={compact || undefined}
      data-kind={kind}
      role={role}
    >
      <span className="hub-surface-state__icon">
        <HubIcon name={ICONS[kind]} size={24} />
      </span>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action ? (
        "href" in action ? (
          <Link className="hub-action-button" href={action.href}>
            {action.label}
          </Link>
        ) : (
          <button
            className="hub-action-button"
            onClick={action.onClick}
            type="button"
          >
            {action.label}
          </button>
        )
      ) : null}
      {aside ? <aside>{aside}</aside> : null}
    </section>
  )
}
