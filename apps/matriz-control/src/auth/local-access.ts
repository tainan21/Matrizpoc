import { createHash, timingSafeEqual } from "node:crypto"

export const CONTROL_SESSION_COOKIE = "matriz_control_session"

export function isConfiguredToken(token: string | undefined): token is string { return typeof token === "string" && token.length >= 16 }
export function createSessionValue(token: string) { return createHash("sha256").update(`matriz-control:v1:${token}`).digest("base64url") }
export function verifySessionValue(token: string, session: string) {
  const expected = Buffer.from(createSessionValue(token))
  const actual = Buffer.from(session)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}
export function configuredToken() { const token = process.env.MATRIZ_CONTROL_LOCAL_TOKEN; if (!isConfiguredToken(token)) throw new Error("MATRIZ_CONTROL_LOCAL_TOKEN must contain at least 16 characters"); return token }
