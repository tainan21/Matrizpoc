import { createHash, timingSafeEqual } from "node:crypto"

export const CONTROL_SESSION_COOKIE = "matriz_control_session"

type ControlRuntime = "web" | "packaged"
const developmentConvenienceTokenHash = "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4"

function isDevelopmentConvenienceToken(token: string): boolean {
  return createHash("sha256").update(token).digest("hex") === developmentConvenienceTokenHash
}

export function isConfiguredToken(token: string | undefined, environment = process.env.NODE_ENV, runtime: ControlRuntime = process.env.MATRIZ_CONTROL_RUNTIME === "desktop-packaged" ? "packaged" : "web"): token is string {
  return typeof token === "string" && (token.length >= 16 || (environment === "development" && runtime === "web" && isDevelopmentConvenienceToken(token)))
}
export function createSessionValue(token: string) { return createHash("sha256").update(`matriz-control:v1:${token}`).digest("base64url") }
export function verifySessionValue(token: string, session: string) {
  const expected = Buffer.from(createSessionValue(token))
  const actual = Buffer.from(session)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}
export function configuredToken() {
  const token = process.env.MATRIZ_CONTROL_LOCAL_TOKEN
  if (!isConfiguredToken(token)) throw new Error(process.env.NODE_ENV === "development" && process.env.MATRIZ_CONTROL_RUNTIME !== "desktop-packaged" ? "MATRIZ_CONTROL_LOCAL_TOKEN is not the approved local development token and is shorter than 16 characters" : "MATRIZ_CONTROL_LOCAL_TOKEN must contain at least 16 characters")
  return token
}
