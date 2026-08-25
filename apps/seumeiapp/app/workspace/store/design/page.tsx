import { redirect } from "next/navigation"
import { resolveActiveCompanyContext } from "../../../../src/application/active-company"
import { readStoreDesign } from "../../../../src/application/store-design-service"
import { resolveCompanyPageFoundation } from "../../../../src/auth/server-page-context"
import { StoreDesignStudio } from "../../../../src/ui/StoreDesignStudio"
import { SystemState } from "../../../../src/ui/SystemState"
import { toStoreDesignViewModel } from "../../../../src/ui/presenters/store-design.presenter"
export default async function StoreDesignPage() { const foundation = await resolveCompanyPageFoundation(); if (foundation.kind === "unavailable") return <SystemState kind="unavailable" />; if (!foundation.preferredCompanyId) redirect("/"); try { const context = await resolveActiveCompanyContext(foundation.actor, foundation.preferredCompanyId, foundation.services.core, foundation.services.companies); const draft = await readStoreDesign(context, foundation.services.storeDesign); return <StoreDesignStudio view={toStoreDesignViewModel(draft)} /> } catch { return <SystemState kind="forbidden" /> } }
