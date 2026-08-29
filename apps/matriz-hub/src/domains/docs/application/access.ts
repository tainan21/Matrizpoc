import type { DocActorType, DocSensitivity, DocVisibility } from "@matriz/integration-api-contracts/v1/docs"
import { allowHubRequest, getDurableHubRequestContext, requireSameOrigin, HubRateLimitError } from "../../../auth/hub-session"
import {
  MATRIZ_DOCS_DEFAULT_TENANT,
  MATRIZ_DOCS_SYSTEM_ACTOR_ID,
  type DocsActorContext,
} from "../domain/types"

/**
 * Transitional server-rendered demo projection. It is intentionally not used
 * by API or MCP code; those surfaces must call getDocsActorContextFromRequest.
 * Item 8's opaque Hub session guard will replace these remaining demo pages.
 */
export const defaultDocsActorContext: DocsActorContext = {
  tenantId: MATRIZ_DOCS_DEFAULT_TENANT,
  actorId: MATRIZ_DOCS_SYSTEM_ACTOR_ID,
  actorType: "system",
  displayName: "MatrizDocs demo renderer",
}

export async function getDocsActorContextFromRequest(request: Request): Promise<DocsActorContext> {
  // Deliberately server-only: public x-tenant/x-actor headers cannot grant authority.
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    requireSameOrigin(request)
  }
  const context = await getDurableHubRequestContext(request)
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && !allowHubRequest(`docs:mutation:${context.session.identity.user.id}`, Date.now(), 20)) throw new HubRateLimitError()
  return { tenantId: context.session.activeTenantId, actorId: context.session.identity.user.id, actorType: "human_user", displayName: context.session.identity.user.name }
}

export function canReadDocsTarget(input: {
  visibility: DocVisibility | string
  sensitivity: DocSensitivity | string
  actor: DocsActorContext
}): boolean {
  if (input.visibility === "public" && input.sensitivity === "normal") return true
  if (input.actor.actorType === "system" || input.actor.actorType === "human_user") return true
  if (input.actor.actorType === "mcp_server" || input.actor.actorType === "ai_agent") {
    return input.visibility !== "private" && input.sensitivity === "normal"
  }
  return input.visibility === "public"
}

export function assertTenantScoped(
  row: { tenantId: string } | null | undefined,
  actor: DocsActorContext,
): void {
  if (!row) throw new Error("MatrizDocs target not found")
  if (row.tenantId !== actor.tenantId) {
    throw new Error("MatrizDocs tenant boundary violation")
  }
}
