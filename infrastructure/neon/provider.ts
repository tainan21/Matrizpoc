import { buildTopologyPlan, type TopologyMode } from "./topology"

type Request = typeof fetch
type Branch = { id: string; name: string; primary?: boolean; default?: boolean }
type Endpoint = { id: string; branch_id: string; host: string; project_id?: string; type?: string }
type State = "existing" | "created"

export type ProviderOptions = {
  projectId: string
  apiKey: string
  ownerName: string
  provisioningBranchId: string
  request?: Request
}

export type PhaseResult = {
  branch: Branch
  database: State
  endpoint: State
  endpointMetadata: Endpoint
}

async function json<T>(response: Response, operation: string): Promise<T> {
  if (!response.ok) throw new Error(`${operation} failed (${response.status})`)
  return (await response.json()) as T
}

function api(options: ProviderOptions) {
  const request = options.request ?? fetch
  const base = `https://console.neon.tech/api/v2/projects/${encodeURIComponent(options.projectId)}`
  const headers = { Accept: "application/json", Authorization: `Bearer ${options.apiKey}`, "Content-Type": "application/json" }
  return { request, base, headers }
}

async function listBranches(options: ProviderOptions): Promise<Branch[]> {
  const { request, base, headers } = api(options)
  const output: Branch[] = []
  let cursor: string | undefined
  do {
    const page = await json<{ branches?: Branch[]; pagination?: { next?: string | null } }>(
      await request(`${base}/branches${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`, { headers }),
      "Neon branch lookup",
    )
    output.push(...(page.branches ?? []))
    cursor = page.pagination?.next ?? undefined
  } while (cursor)
  return output
}

async function ensureDatabase(mode: Exclude<TopologyMode, "dry-run">, branch: Branch, options: ProviderOptions): Promise<State> {
  const { request, base, headers } = api(options)
  const url = `${base}/branches/${encodeURIComponent(branch.id)}/databases`
  const current = await json<{ databases?: Array<{ name: string }> }>(await request(url, { headers }), `Neon database lookup (${branch.name})`)
  if (current.databases?.some((item) => item.name === "matriz")) return "existing"
  if (mode === "verify") throw new Error(`Neon matriz database is missing on ${branch.name}`)
  await json(await request(url, { method: "POST", headers, body: JSON.stringify({ database: { name: "matriz", owner_name: options.ownerName } }) }), `Neon matriz database creation (${branch.name})`)
  return "created"
}

async function ensureEndpoint(mode: Exclude<TopologyMode, "dry-run">, branch: Branch, options: ProviderOptions): Promise<{ state: State; metadata: Endpoint }> {
  const { request, base, headers } = api(options)
  const response = await json<{ endpoints?: Endpoint[] }>(await request(`${base}/endpoints`, { headers }), "Neon endpoint lookup")
  let endpoint = response.endpoints?.find((item) => item.branch_id === branch.id && item.type === "read_write")
  let state: State = "existing"
  if (!endpoint) {
    if (mode === "verify") throw new Error(`Neon endpoint is missing on ${branch.name}`)
    const created = await json<{ endpoint: Endpoint }>(await request(`${base}/endpoints`, {
      method: "POST", headers, body: JSON.stringify({ endpoint: { branch_id: branch.id, type: "read_write" } }),
    }), `Neon endpoint creation (${branch.name})`)
    endpoint = created.endpoint
    state = "created"
  }
  if (!endpoint.host || endpoint.type !== "read_write" || endpoint.branch_id !== branch.id || (endpoint.project_id && endpoint.project_id !== options.projectId)) {
    throw new Error("Neon endpoint metadata mismatch")
  }
  return { state, metadata: endpoint }
}

export async function reconcilePrimaryPhase(mode: Exclude<TopologyMode, "dry-run">, options: ProviderOptions): Promise<PhaseResult> {
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(options.ownerName)) throw new Error("Unsafe Neon database owner")
  const branches = await listBranches(options)
  const branch = branches.find((item) => item.primary === true || item.default === true)
  if (!branch) throw new Error("Neon primary/default branch is missing")
  if (branch.id !== options.provisioningBranchId) throw new Error("Provisioning branch ID does not match Neon primary/default branch")
  const database = await ensureDatabase(mode, branch, options)
  const endpoint = await ensureEndpoint(mode, branch, options)
  return { branch, database, endpoint: endpoint.state, endpointMetadata: endpoint.metadata }
}

export async function reconcileCiPhase(mode: Exclude<TopologyMode, "dry-run">, options: ProviderOptions): Promise<PhaseResult> {
  const branches = await listBranches(options)
  let branch = branches.find((item) => item.name === buildTopologyPlan().ciBranch.name)
  let branchState: State = "existing"
  if (!branch) {
    if (mode === "verify") throw new Error("Neon CI branch is missing")
    const { request, base, headers } = api(options)
    const created = await json<{ branch: Branch }>(await request(`${base}/branches`, {
      method: "POST", headers, body: JSON.stringify({ branch: { name: buildTopologyPlan().ciBranch.name } }),
    }), "Neon CI branch creation")
    branch = created.branch
    branchState = "created"
  }
  const database = await ensureDatabase(mode, branch, options)
  const endpoint = await ensureEndpoint(mode, branch, options)
  return { branch: { ...branch, name: branchState === "created" ? branch.name : branch.name }, database, endpoint: endpoint.state, endpointMetadata: endpoint.metadata }
}
