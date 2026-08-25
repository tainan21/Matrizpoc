import { redirect } from "next/navigation"
import { resolveActiveCompanyContext } from "../../../../src/application/active-company"
import { readStoreDesign } from "../../../../src/application/store-design-service"
import { resolveCompanyPageFoundation } from "../../../../src/auth/server-page-context"
import { Storefront } from "../../../../src/ui/Storefront"
import { SystemState } from "../../../../src/ui/SystemState"
import { toPrivateStorePreviewViewModel } from "../../../../src/ui/presenters/store-design.presenter"
export default async function StorePreviewPage() { const foundation = await resolveCompanyPageFoundation(); if (foundation.kind === "unavailable") return <SystemState kind="unavailable" />; if (!foundation.preferredCompanyId) redirect("/"); try { const context = await resolveActiveCompanyContext(foundation.actor, foundation.preferredCompanyId, foundation.services.core, foundation.services.companies); const [draft, products] = await Promise.all([readStoreDesign(context, foundation.services.storeDesign), foundation.services.catalog.listProducts(context.company.tenantId)]); return <Storefront mode="preview" store={toPrivateStorePreviewViewModel(draft, products)} /> } catch { return <SystemState kind="forbidden" /> } }
