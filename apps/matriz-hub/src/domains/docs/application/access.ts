import type { NextRequest } from "next/server"
import type { DocActorType, DocSensitivity, DocVisibility } from "@matriz/integration-api-contracts/v1/docs"
import {
  MATRIZ_DOCS_DEFAULT_TENANT,
  MATRIZ_DOCS_SYSTEM_ACTOR_ID,
  type DocsActorContext,
} from "../domain/types"

const ACTOR_TYPES: readonly DocActorType[] = [
  "human_user",
  "mcp_server",
  "ai_agent",
  "worker",
  "scheduler",
  "system",
  "external_source",
]

export const defaultDocsActorContext: DocsActorContext = {
  tenantId: MATRIZ_DOCS_DEFAULT_TENANT,
  actorId: MATRIZ_DOCS_SYSTEM_ACTOR_ID,
  actorType: "system",
  displayName: "MatrizDocs System",
}

export function getDocsActorContextFromHeaders(
  headers: Headers,
): DocsActorContext {
  const actorTypeHeader = headers.get("x-actor-type")
  const actorType = ACTOR_TYPES.includes(actorTypeHeader as DocActorType)
    ? (actorTypeHeader as DocActorType)
    : "human_user"

  return {
    tenantId: headers.get("x-tenant-id") ?? MATRIZ_DOCS_DEFAULT_TENANT,
    actorId: headers.get("x-actor-id") ?? "tai",
    actorType,
    displayName: headers.get("x-actor-name") ?? "Tai",
  }
}

export function getDocsActorContextFromRequest(
  request: Request | NextRequest,
): DocsActorContext {
  return getDocsActorContextFromHeaders(request.headers)
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
