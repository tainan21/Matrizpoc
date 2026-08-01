"use client"

import { useEffect, type ReactNode } from "react"
import { bootstrapSites } from "./index"

export function SitesBootstrap({ children }: { children: ReactNode }) {
  useEffect(() => {
    bootstrapSites()
  }, [])
  return children
}
