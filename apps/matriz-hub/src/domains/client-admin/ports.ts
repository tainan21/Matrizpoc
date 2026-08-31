import type { ClientAdminDashboard } from "@matriz/integration-api-contracts"
import type { ClientPortalData } from "./domain"

export interface ClientAdminRepository {
  load(tenantId: string): Promise<ClientPortalData>
  refresh?(tenantId: string): Promise<void>
}

export interface ClientAdminDashboardCache {
  read(tenantId: string): Promise<ClientAdminDashboard | null>
  write(tenantId: string, dashboard: ClientAdminDashboard): Promise<void>
}
