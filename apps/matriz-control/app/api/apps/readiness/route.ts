import { INSTALLABLE_APPS } from "../../../../src/integration/apps/installable-app-catalog"

const readinessTimeoutMs = 750

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const appId = new URL(request.url).searchParams.get("appId")
  const app = INSTALLABLE_APPS.find((candidate) => candidate.manifest.appId === appId)

  if (!app) return Response.json({ error: "Unknown app" }, { status: 404 })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), readinessTimeoutMs)
  let ready = false

  try {
    ready = (await fetch(app.baseUrl, { method: "HEAD", cache: "no-store", signal: controller.signal })).ok
  } catch {
    ready = false
  } finally {
    clearTimeout(timeout)
  }

  return Response.json({ appId: app.manifest.appId, ready }, { headers: { "Cache-Control": "no-store" } })
}
