import { randomUUID } from "node:crypto"
import { getCoreDb } from "@matriz/platform-db/core"
import { getSeumeiDb } from "@matriz/platform-db/seumei"
import { getGlobalEventBus } from "@matriz/integration-events"
import { asAppId } from "@matriz/foundation-types"
import { createCompanyRepository } from "../infrastructure/company.repository"
import { createCoreAccessRepository } from "../infrastructure/core-access.repository"
import { resolveDatabaseAvailability } from "../infrastructure/database-config"
import type { CompanyHttpServices } from "../http/company-handlers"

export type CompanyServicesResolution =
  | { readonly kind: "ready"; readonly services: CompanyHttpServices }
  | { readonly kind: "unavailable" }

export function createCompanyServices(
  env: Readonly<Record<string, string | undefined>> = process.env,
): CompanyServicesResolution {
  if (resolveDatabaseAvailability(env).kind === "unavailable") {
    return { kind: "unavailable" }
  }
  return {
    kind: "ready",
    services: {
      core: createCoreAccessRepository(getCoreDb()),
      companies: createCompanyRepository(getSeumeiDb()),
      ids: { tenantId: randomUUID },
      events: {
        companySelected(company) {
          getGlobalEventBus().emit("seumei.establishment.selected", {
            sourceApp: asAppId("seumei"),
            tenantId: company.tenantId,
            payload: {
              establishmentId: company.id,
              tenantId: company.tenantId,
              name: company.name,
            },
          })
        },
      },
    },
  }
}
