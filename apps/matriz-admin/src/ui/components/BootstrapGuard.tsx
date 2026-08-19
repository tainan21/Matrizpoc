"use client"

import { useEffect } from "react"
import { bootstrapSeumei } from "../../bootstrap"

export function BootstrapGuard({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    bootstrapSeumei()
  }, [])
  return <>{children}</>
}
