import type {
  Company,
  CompanyOnboarding,
  CompanyOperationType,
} from "../company"

export interface CreateProvisioningRecord {
  readonly tenantId: string
  readonly name: string
  readonly slug: string
  readonly createdByUserId: string
  readonly idempotencyKey: string
}

export interface SaveOnboardingRecord {
  readonly companyId: string
  readonly tenantId: string
  readonly expectedVersion: number
  readonly next: CompanyOnboarding
}

export interface CompleteOnboardingRecord {
  readonly companyId: string
  readonly tenantId: string
  readonly expectedVersion: number
  readonly operationType: CompanyOperationType
  readonly city: string
  readonly country: string
  readonly currency: "BRL" | "USD" | "EUR"
}

export interface CompanyRepository {
  listVisibleByTenantIds(tenantIds: readonly string[]): Promise<readonly Company[]>
  findByIdForTenantIds(
    companyId: string,
    tenantIds: readonly string[],
  ): Promise<Company | null>
  findByActorIdempotency(userId: string, key: string): Promise<Company | null>
  createProvisioning(input: CreateProvisioningRecord): Promise<Company>
  markOnboarding(companyId: string, tenantId: string): Promise<Company>
  markProvisioningFailed(companyId: string, tenantId: string): Promise<void>
  removeProvisioning(companyId: string, tenantId: string): Promise<void>
  readOnboarding(
    companyId: string,
    tenantId: string,
  ): Promise<CompanyOnboarding | null>
  saveOnboarding(input: SaveOnboardingRecord): Promise<CompanyOnboarding>
  completeOnboarding(
    input: CompleteOnboardingRecord,
  ): Promise<{ company: Company; onboarding: CompanyOnboarding }>
}
