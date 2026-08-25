import { notFound, redirect } from "next/navigation"
import { resolveActiveCompanyContext } from "../../../../src/application/active-company"
import { readIngredientStock } from "../../../../src/application/restaurant-service"
import { resolveCompanyPageFoundation } from "../../../../src/auth/server-page-context"
import { can } from "../../../../src/domain/membership"
import { StockMovementPanel } from "../../../../src/ui/StockMovementPanel"
import { SystemState } from "../../../../src/ui/SystemState"
import { formatIngredientQuantity } from "../../../../src/ui/presenters/stock.presenter"

export default async function StockDetailPage({ params }: { params: Promise<{ ingredientId: string }> }) {
  const foundation = await resolveCompanyPageFoundation(); if (foundation.kind === "unavailable") return <SystemState kind="unavailable" />; if (!foundation.preferredCompanyId) redirect("/")
  try { const [{ ingredientId }, context] = await Promise.all([params, resolveActiveCompanyContext(foundation.actor, foundation.preferredCompanyId, foundation.services.core, foundation.services.companies)]); const detail = await readIngredientStock(context, ingredientId, foundation.services.restaurant); if (!detail) notFound(); const unit = detail.ingredient.unit; return <StockMovementPanel canManage={can(context.role, "stock.manage")} ingredient={{ id: detail.ingredient.id, name: detail.ingredient.name, balance: formatIngredientQuantity(detail.ingredient.balance, unit), threshold: formatIngredientQuantity(detail.ingredient.lowStockThreshold, unit), version: detail.ingredient.version }} movements={detail.movements.map((item) => ({ id: item.id, type: item.type, quantity: formatIngredientQuantity(item.signedQuantity, unit), balanceAfter: formatIngredientQuantity(item.balanceAfter, unit), reason: item.reason, createdAt: new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.createdAt)) }))} /> } catch { return <SystemState kind="forbidden" /> }
}
