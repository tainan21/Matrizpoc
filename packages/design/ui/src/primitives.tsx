/**
 * @matriz/design-ui/primitives
 *
 * Base UI primitives. No domain, no integration, no state. Purely visual
 * building blocks driven by Tailwind classes. Apps and feature packages
 * compose richer UI from these (L4/L6).
 */
import type { ReactNode, HTMLAttributes, ButtonHTMLAttributes } from "react"
import { cn } from "@matriz/foundation-utils"

// ---------------------------------------------------------------------------
// Stack
// ---------------------------------------------------------------------------

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  gap?: 1 | 2 | 3 | 4 | 5 | 6 | 8
  align?: "start" | "center" | "end" | "stretch"
  direction?: "row" | "col"
}

const gapMap: Record<NonNullable<StackProps["gap"]>, string> = {
  1: "gap-1",
  2: "gap-2",
  3: "gap-3",
  4: "gap-4",
  5: "gap-5",
  6: "gap-6",
  8: "gap-8",
}

export function Stack({
  gap = 4,
  align = "stretch",
  direction = "col",
  className,
  children,
  ...rest
}: StackProps) {
  return (
    <div
      className={cn(
        "flex",
        direction === "col" ? "flex-col" : "flex-row",
        gapMap[gap],
        align === "center" && "items-center",
        align === "start" && "items-start",
        align === "end" && "items-end",
        align === "stretch" && "items-stretch",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Container
// ---------------------------------------------------------------------------

export function Container({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8", className)}
      {...rest}
    >
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

export function Card({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface p-4 text-surface-fg shadow-sm",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mb-3 flex flex-col gap-1 border-b border-border pb-3", className)}
      {...rest}
    >
      {children}
    </div>
  )
}

export function CardTitle({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-lg font-semibold leading-tight text-surface-fg", className)}
      {...rest}
    >
      {children}
    </h3>
  )
}

export function CardDescription({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm leading-relaxed text-muted-fg", className)} {...rest}>
      {children}
    </p>
  )
}

// ---------------------------------------------------------------------------
// Heading / Text
// ---------------------------------------------------------------------------

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3 | 4
}

export function Heading({ level = 1, className, children, ...rest }: HeadingProps) {
  const Tag = (`h${level}` as unknown) as "h1" | "h2" | "h3" | "h4"
  const sizeMap = {
    1: "text-3xl md:text-4xl font-semibold tracking-tight",
    2: "text-2xl md:text-3xl font-semibold tracking-tight",
    3: "text-xl font-semibold",
    4: "text-lg font-semibold",
  } as const
  return (
    <Tag className={cn(sizeMap[level], "text-balance text-surface-fg", className)} {...rest}>
      {children}
    </Tag>
  )
}

export interface TextProps extends HTMLAttributes<HTMLParagraphElement> {
  tone?: "default" | "muted"
  size?: "xs" | "sm" | "base" | "lg"
}

export function Text({
  tone = "default",
  size = "base",
  className,
  children,
  ...rest
}: TextProps) {
  return (
    <p
      className={cn(
        "leading-relaxed text-pretty",
        size === "xs" && "text-xs",
        size === "sm" && "text-sm",
        size === "base" && "text-base",
        size === "lg" && "text-lg",
        tone === "default" ? "text-surface-fg" : "text-muted-fg",
        className,
      )}
      {...rest}
    >
      {children}
    </p>
  )
}

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "link"
  size?: "sm" | "md" | "lg"
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        size === "sm" && "h-8 px-3 text-sm",
        size === "md" && "h-10 px-4 text-sm",
        size === "lg" && "h-12 px-6 text-base",
        variant === "primary" && "bg-brand text-brand-fg hover:opacity-90",
        variant === "secondary" &&
          "border border-border bg-surface text-surface-fg hover:bg-muted",
        variant === "ghost" && "bg-transparent text-surface-fg hover:bg-muted",
        variant === "link" && "bg-transparent p-0 text-brand underline hover:opacity-90 h-auto",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: "neutral" | "brand" | "success" | "warning" | "danger"
}

export function Badge({
  tone = "neutral",
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        tone === "neutral" && "bg-muted text-muted-fg",
        tone === "brand" && "bg-brand text-brand-fg",
        tone === "success" && "bg-emerald-100 text-emerald-800",
        tone === "warning" && "bg-amber-100 text-amber-800",
        tone === "danger" && "bg-rose-100 text-rose-800",
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Alert
// ---------------------------------------------------------------------------

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  tone?: "info" | "warning" | "danger" | "success"
  title?: string
}

export function Alert({
  tone = "info",
  title,
  className,
  children,
  ...rest
}: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-md border p-3 text-sm",
        tone === "info" && "border-sky-200 bg-sky-50 text-sky-900",
        tone === "warning" && "border-amber-200 bg-amber-50 text-amber-900",
        tone === "danger" && "border-rose-200 bg-rose-50 text-rose-900",
        tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-900",
        className,
      )}
      {...rest}
    >
      {title ? <div className="mb-1 font-semibold">{title}</div> : null}
      <div className="leading-relaxed">{children}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

export interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 p-10 text-center",
        className,
      )}
    >
      <Heading level={4} className="text-surface-fg">
        {title}
      </Heading>
      {description ? (
        <Text tone="muted" size="sm" className="max-w-md">
          {description}
        </Text>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}
