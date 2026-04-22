"use client"

import { useEffect } from "react"
import { bootstrapSpot } from "../../bootstrap"

export function BootstrapGuard({ children }: { children: React.ReactNode }): React.ReactElement {
  useEffect(() => {
    bootstrapSpot()
  }, [])
  return <>{children}</>
}
