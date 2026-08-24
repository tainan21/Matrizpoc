"use client"

import { useEffect, type PropsWithChildren } from "react"
import { bootstrap } from "./index"

/** Registers the portal manifest once from the root client layout. */
export function MatrizLibBootstrapProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    bootstrap()
  }, [])

  return children
}
