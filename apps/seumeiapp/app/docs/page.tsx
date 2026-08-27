import { redirect } from "next/navigation"
import { resolveActiveCompanyContext } from "../../src/application/active-company"
import { resolveCompanyPageFoundation } from "../../src/auth/server-page-context"
import { RouteFlowLab } from "../../src/ui/RouteFlowLab"
import { SystemState } from "../../src/ui/SystemState"
export default async function RouteFlowsPage() {
  const foundation = await resolveCompanyPageFoundation()
  if (foundation.kind === "unavailable") return <SystemState kind="unavailable" />
  if (!foundation.preferredCompanyId) redirect("/")
  try { await resolveActiveCompanyContext(foundation.actor, foundation.preferredCompanyId, foundation.services.core, foundation.services.companies); return <RouteFlowLab /> }
  catch { return <SystemState kind="forbidden" /> }
}
