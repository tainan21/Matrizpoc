import { NextResponse } from "next/server"
import { MATRIZ_APP_IDS, type MatrizAppId } from "@matriz/foundation-constants"
import { capabilityStore } from "../../../../src/domains/capabilities/application/capability-store"
import { resolveHubActor } from "../../../../src/auth/actor-context"
import { getMockAuthCorsHeaders } from "../../../../src/auth/mock-auth-cors"

function appId(value: string | null): MatrizAppId | null { return MATRIZ_APP_IDS.includes(value as MatrizAppId) ? value as MatrizAppId : null }
export function GET(request: Request) {
  const actor = resolveHubActor(request); const targetApp = appId(new URL(request.url).searchParams.get("appId")); const headers = getMockAuthCorsHeaders(request.headers.get("origin"))
  if (!actor || !targetApp) return NextResponse.json({ error: "Sessão ou app inválido." }, { status: 401, headers })
  return NextResponse.json({ themes: capabilityStore.listThemes(actor, targetApp), persistence: capabilityStore.persistence }, { headers })
}
