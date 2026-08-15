import type { HTMLAttributes } from "react"

import { cn } from "@matriz/foundation-utils"

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3 | 4
}

export function Heading({ level = 1, className, ...props }: HeadingProps) {
  const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4"

  return (
    <Tag className={cn("matriz-heading", `matriz-heading--${level}`, className)} {...props} />
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
  ...props
}: TextProps) {
  return (
    <p
      className={cn(
        "matriz-text",
        `matriz-text--${tone}`,
        `matriz-text--${size}`,
        className,
      )}
      {...props}
    />
  )
}
