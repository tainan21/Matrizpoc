export function resolveApprovedSurfaceUrl(port: number, path: string | null) {
  if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error("Invalid approved surface port")
  const safePath = path ?? "/"
  if (!safePath.startsWith("/") || safePath.startsWith("//") || safePath.includes("://")) throw new Error("Invalid surface path")
  const origin = `http://127.0.0.1:${port}`
  return { url: `${origin}${safePath}`, origin }
}

export function isAllowedSurfaceNavigation(candidate: string, approvedOrigin: string): boolean {
  try {
    const url = new URL(candidate)
    return url.protocol === "http:" && url.origin === approvedOrigin
  } catch { return false }
}

export function assessEmbedding(headers: Readonly<Record<string, string | undefined>>): { compatible: true } | { compatible: false; reason: "x-frame-options" | "csp-frame-ancestors" } {
  const normalized = Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]))
  if (normalized["x-frame-options"]?.trim()) return { compatible: false, reason: "x-frame-options" }
  if (/\bframe-ancestors\b/i.test(normalized["content-security-policy"] ?? "")) return { compatible: false, reason: "csp-frame-ancestors" }
  return { compatible: true }
}
