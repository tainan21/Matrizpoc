import type { Metadata } from "next"
import { getGlobalInstitutionalRegistry } from "@matriz/integration-registry-core/institutional"
import { ensureInstitutionalBootstrapped } from "../../src/bootstrap"
import { toProjectListItemVM } from "../../src/institutional/presenters"
import { PublicHeader } from "../../src/institutional/components/public/PublicHeader"
import { PublicHero } from "../../src/institutional/components/public/PublicHero"
import { PublicProjectGrid } from "../../src/institutional/components/public/PublicProjectGrid"
import { PublicEcosystemStats } from "../../src/institutional/components/public/PublicEcosystemStats"
import { PublicFooter } from "../../src/institutional/components/public/PublicFooter"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Matriz — ecossistema institucional",
  description:
    "Superficie publica do ecossistema Matriz. Apps, ventures, saude e metricas institucionais abertas.",
}

export default async function PublicLandingPage() {
  await ensureInstitutionalBootstrapped()
  const registry = getGlobalInstitutionalRegistry()
  const stats = registry.stats()
  const projects = registry.publicView()
  const vms = projects.map(toProjectListItemVM)

  const internalCount = projects.filter((p) => p.sourceType === "internal_monorepo_app").length
  const institutionalCount = projects.filter((p) => p.sourceType === "institutional_source").length

  return (
    <main style={{ minHeight: "100vh", background: "var(--color-background)" }}>
      <PublicHeader />
      <PublicHero
        totalPublic={projects.length}
        internalCount={internalCount}
        institutionalCount={institutionalCount}
      />
      <PublicEcosystemStats stats={stats} />
      <PublicProjectGrid vms={vms} />
      <PublicFooter />
    </main>
  )
}
