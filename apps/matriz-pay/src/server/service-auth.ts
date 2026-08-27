import { timingSafeEqual } from "node:crypto"

export function requireOpsService(request: Request): string {
  const expected = process.env.MATRIZ_OPS_SERVICE_TOKEN
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? ""
  if (!expected || expected.length < 16) throw new Error("SERVICE_AUTH_UNAVAILABLE")
  const left = Buffer.from(provided)
  const right = Buffer.from(expected)
  if (left.length !== right.length || !timingSafeEqual(left, right)) throw new Error("SERVICE_AUTH_INVALID")
  return request.headers.get("x-matriz-actor-id") || "matriz-ops"
}
