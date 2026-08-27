import { redirect } from "next/navigation"
import { resolveActiveCompanyContext } from "../../../../src/application/active-company"
import { readCatalog } from "../../../../src/application/catalog-service"
import { resolveCompanyPageFoundation } from "../../../../src/auth/server-page-context"
import { CatalogEditor } from "../../../../src/ui/CatalogEditor"
import { SystemState } from "../../../../src/ui/SystemState"
export default async function NewProductPage() { const foundation = await resolveCompanyPageFoundation(); if (foundation.kind === "unavailable") return <SystemState kind="unavailable" />; if (!foundation.preferredCompanyId) redirect("/"); try { const context = await resolveActiveCompanyContext(foundation.actor, foundation.preferredCompanyId, foundation.services.core, foundation.services.companies); const catalog = await readCatalog(context, foundation.services.catalog); if (!catalog.canManage) return <SystemState kind="forbidden" />; return <CatalogEditor categories={catalog.categories.map(({ id, name }) => ({ id, name }))} /> } catch { return <SystemState kind="forbidden" /> } }
