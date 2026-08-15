import { forwardRef, type ButtonHTMLAttributes } from "react"

import { cn } from "@matriz/foundation-utils"

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "link"
  size?: "sm" | "md" | "lg"
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    type = "button",
    className,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "matriz-button",
        `matriz-button--${variant}`,
        `matriz-button--${size}`,
        className,
      )}
      {...props}
    />
  )
})
