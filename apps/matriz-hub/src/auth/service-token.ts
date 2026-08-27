import { timingSafeEqual } from "node:crypto"

export function hasValidServiceToken(request: Request, expected = process.env.MATRIZ_TELEMETRY_INGEST_TOKEN): boolean {
  if (!expected || expected.length < 16) return false
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? ""
  const left = Buffer.from(provided)
  const right = Buffer.from(expected)
  return left.length === right.length && timingSafeEqual(left, right)
}
