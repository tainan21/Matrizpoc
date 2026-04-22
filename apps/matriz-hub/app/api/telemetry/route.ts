import { NextResponse } from "next/server"
import { collectAllTelemetry } from "@matriz/platform-telemetry"
import { bootstrapMatrizHub } from "../../../src/bootstrap"

export async function GET() {
  bootstrapMatrizHub()
  const events = collectAllTelemetry()
  return NextResponse.json({ count: events.length, events })
}
