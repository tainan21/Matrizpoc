import { randomUUID } from "node:crypto"
import { getCoreDb } from "@matriz/platform-db/core"
import { getSeumeiDb } from "@matriz/platform-db/seumei"
import { createCompanyRepository } from "../infrastructure/company.repository"
import { createCoreAccessRepository } from "../infrastructure/core-access.repository"
import { createCatalogRepository } from "../infrastructure/catalog.repository"
import { createPortfolioRepository } from "../infrastructure/portfolio.repository"
import { createRestaurantRepository } from "../infrastructure/restaurant.repository"
import { createCommerceRepository } from "../infrastructure/commerce.repository"
import { createFinanceRepository } from "../infrastructure/finance.repository"
import { createStoreDesignRepository } from "../infrastructure/store-design.repository"
import { createCompanySelectionRepository } from "../infrastructure/company-selection.repository"
import { resolveDatabaseAvailability } from "../infrastructure/database-config"
import type { CompanyHttpServices } from "../http/company-handlers"
import type { CatalogRepository } from "../domain/repositories/catalog-repository"
import type { PortfolioRepository } from "../domain/repositories/portfolio-repository"
import type { RestaurantRepository } from "../domain/repositories/restaurant-repository"
import type { CommerceRepository } from "../domain/repositories/commerce-repository"
import type { FinanceRepository } from "../domain/repositories/finance-repository"
import type { StoreDesignRepository } from "../domain/repositories/store-design-repository"

export type CompanyServicesResolution =
  | { readonly kind: "ready"; readonly services: CompanyHttpServices & { readonly catalog: CatalogRepository; readonly portfolio: PortfolioRepository; readonly restaurant: RestaurantRepository; readonly commerce: CommerceRepository; readonly finance: FinanceRepository; readonly storeDesign: StoreDesignRepository } }
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
      selections: createCompanySelectionRepository(getSeumeiDb()),
      catalog: createCatalogRepository(getSeumeiDb()),
      portfolio: createPortfolioRepository(getSeumeiDb()),
      restaurant: createRestaurantRepository(getSeumeiDb()),
      commerce: createCommerceRepository(getSeumeiDb()),
      finance: createFinanceRepository(getSeumeiDb()),
      storeDesign: createStoreDesignRepository(getSeumeiDb()),
      ids: { tenantId: randomUUID },
    },
  }
}
