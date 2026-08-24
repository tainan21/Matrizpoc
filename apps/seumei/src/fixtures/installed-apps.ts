import type { InstalledApp } from "../domains/apps/domain/app"
import { asCompanyId } from "../domains/companies/domain/company"

export const FIXTURE_INSTALLED_APPS: readonly InstalledApp[] = [
  ...(["dashboard", "crm", "products", "orders", "inventory", "finance", "store"] as const).map(
    (appId): InstalledApp => ({
      companyId: asCompanyId("company-galaxia"),
      appId,
      status: "active",
      installedAt: "2026-06-01T12:00:00.000Z",
    }),
  ),
  ...(["dashboard", "crm", "products", "reports"] as const).map(
    (appId): InstalledApp => ({
      companyId: asCompanyId("company-matriz-labs"),
      appId,
      status: "active",
      installedAt: "2026-07-15T12:00:00.000Z",
    }),
  ),
]
