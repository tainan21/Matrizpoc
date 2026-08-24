import { redirect } from "next/navigation"
import { resolveActiveCompanyContext } from "../../../src/application/active-company"
import { readIngredients } from "../../../src/application/restaurant-service"
import { resolveCompanyPageFoundation } from "../../../src/auth/server-page-context"
import { can } from "../../../src/domain/membership"
import { IngredientManager } from "../../../src/ui/IngredientManager"
import { SystemState } from "../../../src/ui/SystemState"
import { toStockListViewModel } from "../../../src/ui/presenters/stock.presenter"

export default async function IngredientsPage() {
  const foundation = await resolveCompanyPageFoundation(); if (foundation.kind === "unavailable") return <SystemState kind="unavailable" />; if (!foundation.preferredCompanyId) redirect("/")
  try { const context = await resolveActiveCompanyContext(foundation.actor, foundation.preferredCompanyId, foundation.services.core, foundation.services.companies); const items = toStockListViewModel(await readIngredients(context, foundation.services.restaurant)); return <IngredientManager initialItems={items} canManage={can(context.role, "recipes.manage")} /> } catch { return <SystemState kind="forbidden" /> }
}
