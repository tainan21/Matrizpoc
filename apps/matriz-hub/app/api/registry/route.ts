import { NextResponse } from "next/server"
import { getGlobalRegistry } from "@matriz/integration-registry-core"

export const dynamic = "force-dynamic"

export function GET() {
  const registry = getGlobalRegistry()
  return NextResponse.json({
    apps: registry.listEnabled(),
    navigation: registry.toNavigation(),
  })
}
