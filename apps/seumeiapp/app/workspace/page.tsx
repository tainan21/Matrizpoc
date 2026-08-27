import { redirect } from "next/navigation"
import { CompanyAccessDeniedError } from "../../src/application/company-access"
import { requireWorkspaceCompany, WorkspaceNotReadyError } from "../../src/application/company-onboarding"
import { resolveActiveCompanyContext } from "../../src/application/active-company"
import { resolveCompanyPageFoundation } from "../../src/auth/server-page-context"
import { CompanyWorkspace } from "../../src/ui/CompanyWorkspace"
import { SystemState } from "../../src/ui/SystemState"
import { toWorkspaceViewModel } from "../../src/ui/presenters/company.presenter"
import { readOrders } from "../../src/application/commerce-service"
import { readIngredients } from "../../src/application/restaurant-service"

export default async function WorkspacePage() {
  const foundation = await resolveCompanyPageFoundation()
  if (foundation.kind === "unavailable") return <SystemState kind="unavailable" />
  if (!foundation.preferredCompanyId) redirect("/")
  try {
    const context = await resolveActiveCompanyContext(foundation.actor, foundation.preferredCompanyId, foundation.services.core, foundation.services.companies)
    const company = await requireWorkspaceCompany(context, foundation.services.companies)
    const [orders, ingredients] = await Promise.all([readOrders(context, foundation.services.commerce), readIngredients(context, foundation.services.restaurant)])
    const today = new Date().toISOString().slice(0, 10)
    const ordersToday = orders.filter((order) => order.createdAt.slice(0, 10) === today)
    return <CompanyWorkspace workspace={toWorkspaceViewModel(company)} operations={{ ordersToday: ordersToday.length, pending: orders.filter((order) => !["COMPLETED", "CANCELLED"].includes(order.status)).length, averageCents: ordersToday.length ? Math.round(ordersToday.reduce((sum, order) => sum + order.totalCents, 0) / ordersToday.length) : 0, lowStock: ingredients.filter((item) => item.balance <= item.lowStockThreshold).length }} />
  } catch (error) {
    if (error instanceof WorkspaceNotReadyError) redirect("/onboarding")
    if (error instanceof CompanyAccessDeniedError) return <SystemState kind="forbidden" />
    return <SystemState kind="unavailable" />
  }
}
