import type { CompanyId } from "../../companies/domain/company"
import type { SeumeiPermission } from "../../memberships/domain/membership"

export type SeumeiAppId =
  | "dashboard"
  | "crm"
  | "products"
  | "orders"
  | "inventory"
  | "finance"
  | "store"
  | "reports"

export interface SeumeiNavigationItem {
  readonly id: string
  readonly label: string
  readonly path: string
}

export interface SeumeiAppDefinition {
  readonly id: SeumeiAppId
  readonly name: string
  readonly description: string
  readonly icon: string
  readonly routeSegment: string
  readonly requiredPermission: SeumeiPermission
  readonly navigation: readonly SeumeiNavigationItem[]
}

export type InstalledAppStatus = "active" | "paused"

export interface InstalledApp {
  readonly companyId: CompanyId
  readonly appId: SeumeiAppId
  readonly status: InstalledAppStatus
  readonly installedAt: string
}
