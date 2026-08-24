import type { TenantId } from "@matriz/foundation-types"

export type CompanyId = string & { readonly __brand: "SeumeiCompanyId" }

export function asCompanyId(value: string | TenantId): CompanyId {
  return value as CompanyId
}

export type CompanyStatus = "active" | "onboarding" | "suspended"

export interface CompanyBranding {
  readonly displayName: string
  readonly shortName: string
  readonly logoUrl: string
  readonly coverUrl: string
  readonly accent: string
}

export interface Company {
  readonly id: CompanyId
  readonly slug: string
  readonly legalName: string
  readonly segment: string
  readonly status: CompanyStatus
  readonly branding: CompanyBranding
  readonly contactEmail: string
}
