import type { Metadata } from "next"
import Link from "next/link"
import { OperationalPageHeader } from "../../../src/ui/structure/OperationalPage"
import { toHealthCheckRunVM } from "../../../src/domains/health-checks/presenter"
import { createHealthCheckRuntime, loadLatestHealthCheckResults } from "../../../src/domains/health-checks/runtime"
import { HealthChecksPanel } from "./HealthChecksPanel"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Health Checks · MyHub",
  description: "Validação rápida das páginas e APIs registradas no ecossistema.",
}

export default async function HealthChecksPage() {
  const runtime = await createHealthCheckRuntime()
  const latest = await loadLatestHealthCheckResults(runtime)
  const initialResults = Object.fromEntries(Object.entries(latest).map(([environment, result]) => [
    environment,
    { routes: toHealthCheckRunVM(result.routes), apis: toHealthCheckRunVM(result.apis) },
  ]))

  return (
    <div className="hub-page">
      <OperationalPageHeader
        actions={<Link className="hub-context-link" href="/health">Voltar à saúde</Link>}
        description="Execute verificações amplas e seguras em todas as superfícies identificáveis, sem interromper na primeira falha."
        eyebrow="Centro operacional / saúde / checks"
        status="available"
        statusLabel="Execução sob demanda"
        title="Route + API Health Checks"
      />
      <HealthChecksPanel
        environments={runtime.profiles.map((profile) => profile.name)}
        initialResults={initialResults}
      />
    </div>
  )
}
