import { NextResponse } from "next/server"
import { capabilityStore } from "../../../../src/domains/capabilities/application/capability-store"
import { resolveHubActor } from "../../../../src/auth/actor-context"
import { getMockAuthCorsHeaders, isAllowedMockAuthOrigin } from "../../../../src/auth/mock-auth-cors"

function response(request: Request, body: unknown, status = 200) { return NextResponse.json(body, { status, headers: getMockAuthCorsHeaders(request.headers.get("origin")) }) }
export function OPTIONS(request: Request) { return isAllowedMockAuthOrigin(request.headers.get("origin")) ? new NextResponse(null, { status: 204, headers: getMockAuthCorsHeaders(request.headers.get("origin")) }) : response(request, { error: "Origem não permitida." }, 403) }
export function GET(request: Request) {
  const actor = resolveHubActor(request)
  return actor ? response(request, { workspace: capabilityStore.getPraticies(actor), persistence: capabilityStore.persistence }) : response(request, { error: "Sessão não encontrada." }, 401)
}
export async function PUT(request: Request) {
  const actor = resolveHubActor(request); if (!actor) return response(request, { error: "Sessão não encontrada." }, 401)
  const body = await request.json().catch(() => ({})) as { action?: "install" | "uninstall" | "open" | "layout"; practicyKey?: string; layout?: ReturnType<typeof capabilityStore.getPraticies>["layout"] }
  try {
    const workspace = body.action === "install" ? capabilityStore.installPracticy(actor, body.practicyKey ?? "")
      : body.action === "uninstall" ? capabilityStore.uninstallPracticy(actor, body.practicyKey ?? "")
      : body.action === "open" ? capabilityStore.openPracticy(actor, body.practicyKey ?? "")
      : body.action === "layout" ? capabilityStore.savePracticyLayout(actor, body.layout ?? [])
      : undefined
    return workspace ? response(request, { workspace, persistence: capabilityStore.persistence }) : response(request, { error: "Ação inválida." }, 400)
  } catch (error) { return response(request, { error: error instanceof Error ? error.message : "Não foi possível atualizar Praticies." }, 400) }
}
