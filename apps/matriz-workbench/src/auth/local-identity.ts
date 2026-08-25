import type { WorkbenchRuntimeMode } from "./runtime-mode"

export interface WorkbenchIdentity {
  id: string
  label: string
  source: "control" | "hub" | "demo"
  roles: readonly ["local-operator"]
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
  if (input.mode === "control-desktop") {
    return localIdentity("control-local", "Control local", "control")
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
