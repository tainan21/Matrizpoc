"use client"

import { EcosystemAccess } from "@matriz/flows-ecosystem"
import { usePathname } from "next/navigation"

export function SeumeiEcosystemAccess() {
  const pathname = usePathname()

  if (pathname.startsWith("/loja/")) return null

  return <EcosystemAccess appId="seumei" />
}
