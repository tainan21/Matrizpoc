import { notFound, redirect } from "next/navigation"
import { resolveActiveCompanyContext } from "../../../../../src/application/active-company"
import { readIngredients, readProductRecipe } from "../../../../../src/application/restaurant-service"
import { resolveCompanyPageFoundation } from "../../../../../src/auth/server-page-context"
import { can } from "../../../../../src/domain/membership"
import { RecipeWorkspace } from "../../../../../src/ui/RecipeWorkspace"
import { SystemState } from "../../../../../src/ui/SystemState"
import { toRecipeViewModel } from "../../../../../src/ui/presenters/recipe.presenter"

const unitLabels = { UNIT: "unidade", GRAM: "grama", MILLILITER: "mililitro" } as const
export default async function RecipePage({ params }: { params: Promise<{ productId: string }> }) {
  const foundation = await resolveCompanyPageFoundation(); if (foundation.kind === "unavailable") return <SystemState kind="unavailable" />; if (!foundation.preferredCompanyId) redirect("/")
  try { const [{ productId }, context] = await Promise.all([params, resolveActiveCompanyContext(foundation.actor, foundation.preferredCompanyId, foundation.services.core, foundation.services.companies)]); const [record, ingredients] = await Promise.all([readProductRecipe(context, productId, foundation.services.restaurant), readIngredients(context, foundation.services.restaurant)]); if (!record) notFound(); return <RecipeWorkspace recipe={toRecipeViewModel(record)} ingredients={ingredients.map((item) => ({ id: item.id, name: item.name, unitLabel: unitLabels[item.unit] }))} canManage={can(context.role, "recipes.manage")} /> } catch { return <SystemState kind="forbidden" /> }
}
