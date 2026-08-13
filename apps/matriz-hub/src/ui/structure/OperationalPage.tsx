import type { CSSProperties, ReactNode } from "react"
import Link from "next/link"
import { HubIcon } from "../environment/icons"
import { StatusLabel, StatusMark } from "../environment/status"
import type { HubIconName, HubStatus } from "../environment/types"

export function OperationalPageHeader({
  eyebrow,
  title,
  description,
  status,
  statusLabel,
  actions,
}: {
  readonly eyebrow: string
  readonly title: string
  readonly description: string
  readonly status?: HubStatus
  readonly statusLabel?: string
  readonly actions?: ReactNode
}) {
  return (
    <header className="hub-page-header">
      <div>
        <p className="hub-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="hub-page-header__actions">
        {status ? <StatusLabel status={status}>{statusLabel}</StatusLabel> : null}
        {actions}
      </div>
    </header>
  )
}

export interface MetricStripItem {
  readonly label: string
  readonly value: string | number
  readonly detail?: string
  readonly status: HubStatus
  readonly icon: HubIconName
}

export function MetricStrip({ items }: { readonly items: readonly MetricStripItem[] }) {
  return (
    <dl className="hub-metric-strip">
      {items.map((item) => (
        <div key={item.label} data-status={item.status}>
          <dt><HubIcon name={item.icon} size={16} />{item.label}</dt>
          <dd>{item.value}</dd>
          {item.detail ? <small>{item.detail}</small> : null}
        </div>
      ))}
    </dl>
  )
}

export function ProgressTrack({
  value,
  status,
  label,
}: {
  readonly value: number
  readonly status: HubStatus
  readonly label: string
}) {
  return (
    <div
      aria-label={`${label}: ${value}%`}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={value}
      className="hub-progress-track"
      data-status={status}
      role="progressbar"
    >
      <span style={{ "--hub-progress": `${Math.max(0, Math.min(value, 100))}%` } as CSSProperties} />
    </div>
  )
}

export function ContextInspector({
  eyebrow,
  title,
  status,
  statusLabel,
  children,
  footer,
}: {
  readonly eyebrow: string
  readonly title: string
  readonly status: HubStatus
  readonly statusLabel: string
  readonly children: ReactNode
  readonly footer?: ReactNode
}) {
  return (
    <aside className="hub-context-inspector">
      <header>
        <div><p className="hub-eyebrow">{eyebrow}</p><h2>{title}</h2></div>
        <StatusLabel compact status={status}>{statusLabel}</StatusLabel>
      </header>
      <div className="hub-context-inspector__body">{children}</div>
      {footer ? <footer>{footer}</footer> : null}
    </aside>
  )
}

export function EntityAction({
  href,
  label,
  technicalLabel,
  description,
  status,
  icon,
}: {
  readonly href: string
  readonly label: string
  readonly technicalLabel: string
  readonly description: string
  readonly status: HubStatus
  readonly icon: HubIconName
}) {
  return (
    <Link className="hub-entity-action" href={href}>
      <span className="hub-entity-action__icon"><HubIcon name={icon} size={18} /></span>
      <span><strong>{label}</strong><small>{technicalLabel}</small><p>{description}</p></span>
      <StatusMark status={status} />
      <HubIcon name="chevron" size={16} />
    </Link>
  )
}
