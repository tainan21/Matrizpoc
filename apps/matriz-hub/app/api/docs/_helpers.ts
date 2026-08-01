import { NextResponse } from "next/server"

export async function readDocsRequestBody(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? ""
  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const form = await request.formData()
    const out: Record<string, unknown> = {}
    for (const [key, value] of form.entries()) {
      out[key] = typeof value === "string" ? value : value.name
    }
    return out
  }
  try {
    const body = await request.json()
    return typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {}
  } catch {
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
  const message = error instanceof Error ? error.message : String(error)
  return NextResponse.json({ ok: false, error: message }, { status })
}
