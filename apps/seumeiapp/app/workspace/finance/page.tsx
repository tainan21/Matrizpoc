import { redirect } from "next/navigation"
import { resolveActiveCompanyContext } from "../../../src/application/active-company"
import { readFinanceOverview } from "../../../src/application/finance-service"
import { resolveCompanyPageFoundation } from "../../../src/auth/server-page-context"
import { FinanceOverview } from "../../../src/ui/FinanceOverview"
import { SystemState } from "../../../src/ui/SystemState"
import { toFinanceOverviewViewModel } from "../../../src/ui/presenters/finance.presenter"

export default async function FinancePage({ searchParams }: { readonly searchParams: Promise<{ month?: string }> }) {
  const foundation = await resolveCompanyPageFoundation()
  if (foundation.kind === "unavailable") return <SystemState kind="unavailable" />
  if (!foundation.preferredCompanyId) redirect("/")
  const now = new Date()
  const requestedMonth = (await searchParams).month
  const month = requestedMonth && /^\d{4}-\d{2}$/.test(requestedMonth) ? requestedMonth : now.toISOString().slice(0, 7)
  try {
    const context = await resolveActiveCompanyContext(foundation.actor, foundation.preferredCompanyId, foundation.services.core, foundation.services.companies)
    const result = await readFinanceOverview(context, month, now.toISOString().slice(0, 10), foundation.services.finance)
    return <FinanceOverview month={month} view={toFinanceOverviewViewModel(result, now.toISOString().slice(0, 10))} />
  } catch { return <SystemState kind="forbidden" /> }
}
