import type { WorkbenchRuntimeMode } from "./runtime-mode"

export interface WorkbenchIdentity {
  id: string
  label: string
  source: "native" | "hub" | "demo"
  roles: readonly ["local-operator"]
}

export const WORKBENCH_IDENTITY_COOKIE = "matriz_workbench_identity"

export function encodeWorkbenchIdentity(identity: WorkbenchIdentity): string {
  return Buffer.from(JSON.stringify(identity)).toString("base64url")
}

export function decodeWorkbenchIdentity(value: string | undefined): WorkbenchIdentity | undefined {
  if (!value || value.length > 1_024) return undefined
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Record<string, unknown>
    if (
      typeof parsed.id !== "string" || !parsed.id || parsed.id.length > 128 ||
      typeof parsed.label !== "string" || !parsed.label || parsed.label.length > 128 ||
      !["native", "hub", "demo"].includes(String(parsed.source)) ||
      !Array.isArray(parsed.roles) || parsed.roles.length !== 1 || parsed.roles[0] !== "local-operator"
    ) return undefined
    return parsed as unknown as WorkbenchIdentity
  } catch {
    return undefined
  }
}

export type LocalIdentityResolution =
  | { status: "authenticated"; identity: WorkbenchIdentity }
  | { status: "login_required" }

interface HubUser {
  id: string
  name: string
}

interface HubSessionResponse {
  identity?: { user?: { id?: unknown; name?: unknown } }
}

export async function readHubIdentity(
  cookieHeader: string,
  fetcher: typeof fetch = fetch,
): Promise<HubUser | null> {
  const response = await fetcher("http://127.0.0.1:3000/api/auth/mock/session", {
    headers: { cookie: cookieHeader },
    cache: "no-store",
    signal: AbortSignal.timeout(750),
  })
  if (response.status === 401) return null
  if (!response.ok) throw new Error(`Hub session failed with status ${response.status}`)
  const value = await response.json() as HubSessionResponse
  const id = value.identity?.user?.id
  const name = value.identity?.user?.name
  if (typeof id !== "string" || typeof name !== "string" || !id || !name) {
    throw new Error("Hub returned an invalid session")
  }
  return { id, name }
}

interface ResolveLocalIdentityInput {
  mode: WorkbenchRuntimeMode
  readHubSession: () => Promise<HubUser | null>
}

const localIdentity = (
  id: string,
  label: string,
  source: WorkbenchIdentity["source"],
): LocalIdentityResolution => ({
  status: "authenticated",
  identity: { id, label, source, roles: ["local-operator"] },
})

export async function resolveLocalIdentity(
  input: ResolveLocalIdentityInput,
): Promise<LocalIdentityResolution> {
  if (input.mode === "native-desktop") {
    return localIdentity("native-desktop-local", "Desktop local", "native")
  }

  try {
    const user = await input.readHubSession()
    return user
      ? localIdentity(user.id, user.name, "hub")
      : { status: "login_required" }
  } catch {
    return localIdentity("demo-local", "Demo local", "demo")
  }
}
