import { NextResponse } from "next/server"
import { capabilityStore } from "../../../../../src/domains/capabilities/application/capability-store"
import { resolveHubActor } from "../../../../../src/auth/actor-context"
import { getMockAuthCorsHeaders } from "../../../../../src/auth/mock-auth-cors"

export async function POST(request: Request) {
  const actor = resolveHubActor(request); const headers = getMockAuthCorsHeaders(request.headers.get("origin"))
  if (!actor) return NextResponse.json({ error: "Sessão não encontrada." }, { status: 401, headers })
  const body = await request.json().catch(() => ({})) as { themeKey?: string; owner?: "user" | "tenant" }
  try { capabilityStore.purchaseTheme(actor, body.themeKey ?? "", body.owner ?? "user"); return NextResponse.json({ purchased: true, persistence: capabilityStore.persistence }, { headers }) }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Checkout indisponível." }, { status: 403, headers }) }
}
