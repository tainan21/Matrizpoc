import type { ReactNode } from "react"

/**
 * Spot-branded login frame. Centers content, uses the Spot warm palette.
 * Different from Hub/Seumei/Contracts/Willdash — proves shared auth does
 * NOT force a single visual identity.
 */
export function LoginLayoutFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-muted">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-stretch justify-center gap-6 p-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-fg">
          <span className="inline-block h-2 w-2 rounded-full bg-brand" />
          {"spot · bandas & gigs"}
        </div>
        {children}
        <p className="text-xs text-muted-fg">
          {"Matriz · ecosystem login. Visual proprio, base compartilhada."}
        </p>
      </div>
    </div>
  )
}
