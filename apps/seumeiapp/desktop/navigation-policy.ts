export type NavigationDecision = "in-app" | "external" | "deny"

export function decideNavigation(url: string, allowedOrigins: readonly string[]): NavigationDecision {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return "deny"
  }

  if (allowedOrigins.includes(parsed.origin)) return "in-app"
  return parsed.protocol === "https:" ? "external" : "deny"
}
