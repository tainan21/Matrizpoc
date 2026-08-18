import type { HTMLAttributes } from "react"

export type RevealProps = HTMLAttributes<HTMLDivElement>

/**
 * Progressive visual reveal. Content is rendered in its final DOM state;
 * CSS adds motion only when the visitor has not requested reduced motion.
 */
export function Reveal({ className, ...props }: RevealProps) {
  return <div className={["reveal", className].filter(Boolean).join(" ")} {...props} />
}
