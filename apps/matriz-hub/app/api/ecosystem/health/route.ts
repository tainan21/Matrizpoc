import { NextResponse } from "next/server"
import { monorepoConfig } from "@matriz/platform-config"

export const dynamic = "force-dynamic"

export async function GET() {
  const rows = await Promise.all(Object.entries(monorepoConfig.baseUrls).map(async ([appId, url]) => {
    if (appId === "matriz-hub") return { appId, port: 3000, status: "current" as const }
    try {
      const response = await fetch(url, { method: "HEAD", cache: "no-store", signal: AbortSignal.timeout(650) })
      return { appId, port: Number(new URL(url).port), status: response.ok ? "online" as const : "offline" as const }
    } catch { return { appId, port: Number(new URL(url).port), status: "offline" as const } }
  }))
  return NextResponse.json(rows)
}
