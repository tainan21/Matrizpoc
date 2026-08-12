import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getHubRequestContext, HubAuthError } from "../../../auth/hub-session"
import type { DocsActorContext } from "../domain/types"

/** Server Component boundary for tenant-owned MatrizDocs pages. */
export async function getDocsPageActorContext(): Promise<DocsActorContext> {
  const cookieJar = await cookies()
  try {
    const context = getHubRequestContext(new Request("http://matriz-hub.local/docs", { headers: { cookie: cookieJar.toString() } }))
    return { tenantId: context.session.activeTenantId, actorId: context.session.identity.user.id, actorType: "human_user", displayName: context.session.identity.user.name }
  } catch (error) {
    if (error instanceof HubAuthError) redirect("/login")
    throw error
  }
}
