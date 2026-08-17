import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { hasActiveHubServerSession } from "../../src/auth/server-session"
import { praticiesCatalog } from "../../src/domains/praticies/application/catalog"
import { inspectProjectPatterns } from "../../src/domains/praticies/application/patterns"
import { filesystemPatternsGenerator } from "../../src/domains/praticies/integration/filesystem/patterns-generator"
import {
  toPatternGenerationVM,
  toPracticeItemVM,
} from "../../src/domains/praticies/presentation/presenters"
import { PraticiesWorkbench } from "./PraticiesWorkbench"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Praticies · MyHub",
  description: "Praticidades, snippets e automações locais do ecossistema Matriz.",
}

export default async function PraticiesPage() {
  if (!(await hasActiveHubServerSession())) redirect("/login")

  const generation = await inspectProjectPatterns(filesystemPatternsGenerator)

  return (
    <PraticiesWorkbench
      practices={praticiesCatalog.map(toPracticeItemVM)}
      initialGeneration={generation ? toPatternGenerationVM(generation) : null}
    />
  )
}
