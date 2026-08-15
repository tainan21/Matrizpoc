import type { HTMLAttributes } from "react"

import { cn } from "@matriz/foundation-utils"

type Gap = 1 | 2 | 3 | 4 | 5 | 6 | 8

const gapClass: Record<Gap, string> = {
  1: "matriz-gap-1",
  2: "matriz-gap-2",
  3: "matriz-gap-3",
  4: "matriz-gap-4",
  5: "matriz-gap-5",
  6: "matriz-gap-6",
  8: "matriz-gap-8",
}

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  gap?: Gap
  align?: "start" | "center" | "end" | "stretch"
  direction?: "row" | "col"
}

export function Stack({
  gap = 4,
  align = "stretch",
  direction = "col",
  className,
  ...props
}: StackProps) {
  return (
    <div
      className={cn(
        "matriz-stack",
        gapClass[gap],
        `matriz-align-${align}`,
        direction === "row" && "matriz-stack--row",
        className,
      )}
      {...props}
    />
  )
}

export interface InlineProps extends HTMLAttributes<HTMLDivElement> {
  gap?: Gap
  align?: "start" | "center" | "end" | "stretch"
  justify?: "start" | "center" | "end" | "between"
  wrap?: boolean
}

export function Inline({
  gap = 2,
  align = "center",
  justify = "start",
  wrap = true,
  className,
  ...props
}: InlineProps) {
  return (
    <div
      className={cn(
        "matriz-inline",
        gapClass[gap],
        `matriz-align-${align}`,
        `matriz-justify-${justify}`,
        wrap && "matriz-inline--wrap",
        className,
      )}
      {...props}
    />
  )
}

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  size?: "md" | "lg" | "xl" | "full"
}

export function Container({ size = "xl", className, ...props }: ContainerProps) {
  return (
    <div
      className={cn("matriz-container", `matriz-container--${size}`, className)}
      {...props}
    />
  )
}

export interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "subtle" | "raised"
  padding?: "none" | "sm" | "md" | "lg"
}

export function Surface({
  variant = "default",
  padding = "md",
  className,
  ...props
}: SurfaceProps) {
  return (
    <div
      className={cn(
        "matriz-surface",
        `matriz-surface--${variant}`,
        `matriz-surface--padding-${padding}`,
        className,
      )}
      {...props}
    />
  )
}

export type CardProps = SurfaceProps

export function Card(props: CardProps) {
  return <Surface {...props} />
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("matriz-card-header", className)} {...props} />
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("matriz-card-title", className)} {...props} />
}

export function CardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("matriz-card-description", className)} {...props} />
}
