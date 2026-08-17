import { NextResponse } from "next/server"
import { MATRIZ_APP_IDS, type MatrizAppId } from "@matriz/foundation-constants"
import { capabilityStore } from "../../../../src/domains/capabilities/application/capability-store"
import { resolveHubActor } from "../../../../src/auth/actor-context"
import { getMockAuthCorsHeaders, isAllowedMockAuthOrigin } from "../../../../src/auth/mock-auth-cors"

function response(request: Request, body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: getMockAuthCorsHeaders(request.headers.get("origin")) })
}
function appId(value: string | null | undefined): MatrizAppId | null { return MATRIZ_APP_IDS.includes(value as MatrizAppId) ? value as MatrizAppId : null }

export function OPTIONS(request: Request) {
  return isAllowedMockAuthOrigin(request.headers.get("origin")) ? new NextResponse(null, { status: 204, headers: getMockAuthCorsHeaders(request.headers.get("origin")) }) : response(request, { error: "Origem não permitida." }, 403)
}
export function GET(request: Request) {
  const targetApp = appId(new URL(request.url).searchParams.get("appId")); const actor = resolveHubActor(request)
  if (!targetApp) return response(request, { error: "App inválido." }, 400)
  if (!actor) return response(request, { error: "Sessão não encontrada." }, 401)
  return response(request, { appearance: capabilityStore.resolveAppearance(actor, targetApp) })
}
export async function PUT(request: Request) {
  const actor = resolveHubActor(request); const body = await request.json().catch(() => ({})) as { appId?: string; themeKey?: string | null }; const targetApp = appId(body.appId)
  if (!targetApp) return response(request, { error: "App inválido." }, 400)
  if (!actor) return response(request, { error: "Sessão não encontrada." }, 401)
  try { return response(request, { appearance: capabilityStore.saveThemePreference(actor, targetApp, body.themeKey ?? undefined) }) }
  catch (error) { return response(request, { error: error instanceof Error ? error.message : "Não foi possível salvar a preferência." }, 403) }
}
