export type DesktopRuntimeConfiguration = { mode: "development" | "production"; seumeiOrigin: string; hubOrigin: string; allowedOrigins: readonly string[] }
export type DesktopBuildInputs = { isPackaged: boolean; builtAppUrl: string; builtHubUrl: string }
export class DesktopConfigurationError extends Error {}

const developmentSeumeiUrl = "http://127.0.0.1:3008"
const developmentHubUrl = "http://127.0.0.1:3000"

export function resolveDesktopRuntimeConfig(inputs: DesktopBuildInputs): DesktopRuntimeConfiguration {
  if (!inputs.isPackaged) return { mode: "development", seumeiOrigin: developmentSeumeiUrl, hubOrigin: developmentHubUrl, allowedOrigins: [developmentSeumeiUrl, developmentHubUrl] }
  const seumeiOrigin = trustedBuildOrigin(inputs.builtAppUrl, "SEUMEI_DESKTOP_APP_URL")
  const hubOrigin = trustedBuildOrigin(inputs.builtHubUrl, "SEUMEI_DESKTOP_HUB_URL")
  return { mode: "production", seumeiOrigin, hubOrigin, allowedOrigins: [seumeiOrigin, hubOrigin] }
}

function trustedBuildOrigin(value: string, variable: string): string {
  if (!value.trim()) throw new DesktopConfigurationError(`${variable} is required in the trusted build`)
  let parsed: URL
  try { parsed = new URL(value) } catch { throw new DesktopConfigurationError(`${variable} must be a valid URL`) }
  if (parsed.protocol !== "https:") throw new DesktopConfigurationError(`${variable} must be an HTTPS URL`)
  if (parsed.username || parsed.password) throw new DesktopConfigurationError(`${variable} must not include credentials`)
  return parsed.origin
}
