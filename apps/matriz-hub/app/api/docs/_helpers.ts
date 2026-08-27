import { NextResponse } from "next/server"
import { HubAuthError, HubRateLimitError } from "../../../src/auth/hub-session"
import { readBoundedText } from "../../../src/http/bounded-body"

const MAX_JSON_BYTES = 64 * 1024

export async function readDocsRequestBody(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? ""
  const text = await readBoundedText(request, MAX_JSON_BYTES)
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const form = new URLSearchParams(text)
    const out: Record<string, unknown> = {}
    for (const [key, value] of form.entries()) out[key] = value
    return out
  }
  if (contentType.includes("multipart/form-data")) throw new Error("Unsupported content type")
  try {
    if (!contentType.includes("application/json")) throw new Error("Unsupported content type")
    const body = JSON.parse(text) as unknown
    return typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {}
  } catch (error) {
    if (error instanceof Error && ["Request body too large", "Unsupported content type"].includes(error.message)) throw error
    return {}
  }
}

export function docsRedirect(request: Request, path: string): NextResponse {
  return NextResponse.redirect(new URL(path, request.url), { status: 303 })
}

export function wantsHtmlRedirect(request: Request): boolean {
  const accept = request.headers.get("accept") ?? ""
  const contentType = request.headers.get("content-type") ?? ""
  return accept.includes("text/html") || contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")
}

export function docsErrorResponse(error: unknown, status = 400): NextResponse {
  const resolvedStatus = error instanceof HubAuthError ? error.status : error instanceof HubRateLimitError ? 429 : status
  const message = resolvedStatus === 401 ? "Authentication required" : resolvedStatus === 403 ? "Access denied" : resolvedStatus === 429 ? "Rate limit exceeded" : "Request could not be processed"
  return NextResponse.json({ ok: false, error: message }, { status: resolvedStatus, headers: { "cache-control": "private, no-store" } })
}
