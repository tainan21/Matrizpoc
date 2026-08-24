import type { HTMLAttributes, ReactNode } from "react"

import { cn } from "@matriz/foundation-utils"

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: "neutral" | "brand" | "success" | "warning" | "danger"
}

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn("matriz-badge", `matriz-badge--${tone}`, className)}
      {...props}
    />
  )
}

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  tone?: "info" | "warning" | "danger" | "success"
  title?: string
}

export function Alert({
  tone = "info",
  title,
  role,
  className,
  children,
  ...props
}: AlertProps) {
  const liveRole = role ?? (tone === "danger" || tone === "warning" ? "alert" : "status")

  return (
    <div
      role={liveRole}
      className={cn("matriz-alert", `matriz-alert--${tone}`, className)}
      {...props}
    >
      {title ? <div className="matriz-alert__title">{title}</div> : null}
      <div className="matriz-alert__content">{children}</div>
    </div>
  )
}

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div className={cn("matriz-empty-state", className)} {...props}>
      <h4 className="matriz-empty-state__title">{title}</h4>
      {description ? <p className="matriz-empty-state__description">{description}</p> : null}
      {action ? <div className="matriz-empty-state__action">{action}</div> : null}
    </div>
  )
}
