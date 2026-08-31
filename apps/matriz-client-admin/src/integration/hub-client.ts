import { clientAdminDashboardSchema, type ClientAdminDashboard } from "@matriz/integration-api-contracts"

export async function fetchClientAdminDashboard(input: { hubUrl: string; accessToken: string; tenantId: string; fetcher?: typeof fetch }): Promise<ClientAdminDashboard> {
  const response = await (input.fetcher ?? fetch)(`${input.hubUrl.replace(/\/$/, "")}/api/client-admin/v1/overview`, {
    headers: { authorization: `Bearer ${input.accessToken}`, "x-matriz-tenant-id": input.tenantId },
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  })
  if (!response.ok) throw new Error("Hub unavailable")
  return clientAdminDashboardSchema.parse(await response.json())
}

export async function refreshClientAdminDashboard(input: { hubUrl: string; accessToken: string; tenantId: string; fetcher?: typeof fetch }): Promise<ClientAdminDashboard> {
  const response = await (input.fetcher ?? fetch)(`${input.hubUrl.replace(/\/$/, "")}/api/client-admin/v1/refresh`, {
    method: "POST", headers: { authorization: `Bearer ${input.accessToken}`, "x-matriz-tenant-id": input.tenantId }, cache: "no-store", signal: AbortSignal.timeout(12_000),
  })
  if (!response.ok) throw new Error("Hub refresh unavailable")
  return clientAdminDashboardSchema.parse(await response.json())
}
