import { notFound, redirect } from "next/navigation"
import { resolveActiveCompanyContext } from "../../../../../src/application/active-company"
import { readFinanceEntry } from "../../../../../src/application/finance-service"
import { resolveCompanyPageFoundation } from "../../../../../src/auth/server-page-context"
import { FinanceEntryDetail } from "../../../../../src/ui/FinanceEntryDetail"
import { SystemState } from "../../../../../src/ui/SystemState"
import { toFinanceEntryViewModel } from "../../../../../src/ui/presenters/finance.presenter"

export default async function FinanceEntryPage({ params }: { readonly params: Promise<{ entryId: string }> }) {
  const foundation = await resolveCompanyPageFoundation()
  if (foundation.kind === "unavailable") return <SystemState kind="unavailable" />
  if (!foundation.preferredCompanyId) redirect("/")
  try {
    const context = await resolveActiveCompanyContext(foundation.actor, foundation.preferredCompanyId, foundation.services.core, foundation.services.companies)
    const entry = await readFinanceEntry(context, (await params).entryId, foundation.services.finance)
    if (!entry) notFound()
    return <FinanceEntryDetail entry={toFinanceEntryViewModel(entry, new Date().toISOString().slice(0, 10))} />
  } catch { return <SystemState kind="forbidden" /> }
}
