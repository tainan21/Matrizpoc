"use client"

import { useEffect, type ReactNode } from "react"
import { bootstrapMatrizWorkbench } from "./index"

export function WorkbenchBootstrap({ children }: { children: ReactNode }) {
  useEffect(() => {
    bootstrapMatrizWorkbench()
  }, [])
  return children
}
