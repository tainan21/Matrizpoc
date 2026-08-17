import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { DEFAULT_PRACTICE_APPS } from "@matriz/flows-praticies"
import { hasActiveHubServerSession } from "../../../src/auth/server-session"
import { toPracticeAppVM } from "../../../src/domains/praticies/presentation/apps-presenter"
import { PraticiesAppStore } from "./PraticiesAppStore"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Apps · Praticies · MyHub",
  description: "Instale e organize automações, atalhos, snippets e gadgets locais.",
}

export default async function PraticiesAppsPage() {
  if (!(await hasActiveHubServerSession())) redirect("/login")
  return <PraticiesAppStore apps={DEFAULT_PRACTICE_APPS.map(toPracticeAppVM)} />
}
