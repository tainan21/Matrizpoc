import { NextResponse } from "next/server"
<<<<<<< HEAD
import { getCoreDb } from "@matriz/platform-db/core"
import { getHubRequestContext, HubAuthError } from "../../../src/auth/hub-session"
=======
import { collectAllTelemetry } from "@matriz/platform-telemetry"
import { bootstrapMatrizHub } from "../../../src/bootstrap"
import { getDurableHubRequestContext, HubAuthError } from "../../../src/auth/hub-session"
>>>>>>> 73482d5 (checkpoint: preserve Wave 1 OIDC foundation worktree)

type TelemetryReader = Pick<ReturnType<typeof getCoreDb>, "telemetryRecord">

export function createTelemetryGet(db: TelemetryReader) {
  return async function getTelemetry(request: Request) {
  let context
<<<<<<< HEAD
  try { context = getHubRequestContext(request) } catch (error) { return NextResponse.json({ error: "Authentication required" }, { status: error instanceof HubAuthError ? error.status : 401, headers: { "cache-control": "private, no-store" } }) }
  const records = await db.telemetryRecord.findMany({where:{tenantId:context.session.activeTenantId},orderBy:{occurredAt:"desc"},take:500})
  const events=records.map(record=>({id:record.id,version:record.eventVersion,appId:record.appId,tenantId:record.tenantId,type:record.eventName,occurredAt:record.occurredAt.toISOString(),properties:record.properties,category:record.category??undefined}))
=======
  try { context = await getDurableHubRequestContext(request) } catch (error) { return NextResponse.json({ error: "Authentication required" }, { status: error instanceof HubAuthError ? error.status : 401, headers: { "cache-control": "private, no-store" } }) }
  bootstrapMatrizHub()
  const events = collectAllTelemetry().filter((event) => event.tenantId === context.session.activeTenantId)
>>>>>>> 73482d5 (checkpoint: preserve Wave 1 OIDC foundation worktree)
  return NextResponse.json({ count: events.length, events }, { headers: { "cache-control": "private, no-store" } })
  }
}

export async function GET(request: Request) {
  return createTelemetryGet(getCoreDb())(request)
}
