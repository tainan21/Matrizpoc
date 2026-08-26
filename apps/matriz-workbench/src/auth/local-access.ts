import { createHash, timingSafeEqual } from "node:crypto"

export const LOCAL_TEST_TOKEN = "1234"

interface LocalAccessEnvironment {
  NODE_ENV?: string
  WORKBENCH_LOCAL_TOKEN?: string
  WORKBENCH_RUNTIME_MODE?: string
  MATRIZ_WORKSPACE_ROOT?: string
}

export function isLocalTestAccessEnabled(
  environment: LocalAccessEnvironment = process.env,
): boolean {
  return environment.NODE_ENV !== "production"
}

export function getRequiredLocalToken(
  environment: LocalAccessEnvironment = process.env,
): string {
  const configuredToken = environment.WORKBENCH_LOCAL_TOKEN
  if (configuredToken && configuredToken.length >= 16) return configuredToken
  if (isLocalTestAccessEnabled(environment)) return LOCAL_TEST_TOKEN
  if (environment.WORKBENCH_RUNTIME_MODE !== "control-desktop") {
    return createHash("sha256")
      .update(`matriz-workbench:demo:${environment.MATRIZ_WORKSPACE_ROOT ?? "local"}`)
      .digest("hex")
  }
  throw new Error(
    "WORKBENCH_LOCAL_TOKEN ausente ou curto. Defina um segredo local com pelo menos 16 caracteres.",
  )
}

function safelyMatches(candidate: string, expected: string): boolean {
  const received = Buffer.from(candidate)
  const target = Buffer.from(expected)
  return target.length === received.length && timingSafeEqual(target, received)
}

export function localTokenMatches(
  candidate: string,
  environment: LocalAccessEnvironment = process.env,
): boolean {
  const configuredToken = environment.WORKBENCH_LOCAL_TOKEN
  if (
    configuredToken &&
    configuredToken.length >= 16 &&
    safelyMatches(candidate, configuredToken)
  ) {
    return true
  }
  return isLocalTestAccessEnabled(environment) && safelyMatches(candidate, LOCAL_TEST_TOKEN)
}

export function localSessionDigest(
  environment: LocalAccessEnvironment = process.env,
): string {
  const token = getRequiredLocalToken(environment)
  return createHash("sha256").update(`matriz-workbench:v1:${token}`).digest("hex")
}
