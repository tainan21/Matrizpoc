"use client"

import { useEffect } from "react"
import { bootstrapMatrizAdmin } from "../../bootstrap"

export function BootstrapGuard({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    bootstrapMatrizAdmin()
  }, [])
  return <>{children}</>
}
