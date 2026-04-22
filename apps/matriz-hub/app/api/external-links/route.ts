import { NextResponse } from "next/server"
import { getGlobalExternalLinkStore } from "@matriz/integration-external-links"

export const dynamic = "force-dynamic"

export function GET() {
  const store = getGlobalExternalLinkStore()
  return NextResponse.json({ links: store.list() })
}
