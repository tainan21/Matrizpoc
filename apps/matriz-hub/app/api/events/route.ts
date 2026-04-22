import { NextResponse } from "next/server"
import { getGlobalEventBus } from "@matriz/integration-events"

export const dynamic = "force-dynamic"

export function GET() {
  const bus = getGlobalEventBus()
  return NextResponse.json({ events: bus.history() })
}
