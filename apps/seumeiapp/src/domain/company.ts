export type CompanyOperationType =
  | "PHYSICAL_STORE"
  | "ONLINE_STORE"
  | "SERVICE"
  | "HYBRID"

export type CompanyStatus =
  | "PROVISIONING"
  | "ONBOARDING"
  | "ACTIVE"
  | "PROVISIONING_FAILED"

export type CompanyRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER"

export type OnboardingStep =
  | "IDENTITY"
  | "OPERATION"
  | "PREFERENCES"
  | "REVIEW"
  | "COMPLETED"

export interface Company {
  readonly id: string
  readonly tenantId: string
  readonly name: string
  readonly slug: string
  readonly createdByUserId: string
  readonly status: CompanyStatus
  readonly operationType: CompanyOperationType | null
  readonly city: string | null
  readonly country: string
}

export interface CompanyOnboarding {
  readonly companyId: string
  readonly tenantId: string
  readonly currentStep: OnboardingStep
  readonly version: number
  readonly draftName: string
  readonly draftSlug: string
  readonly draftOperationType: CompanyOperationType | null
  readonly draftCity: string | null
  readonly draftCountry: string
  readonly draftCurrency: "BRL" | "USD" | "EUR"
  readonly completedSteps: readonly OnboardingStep[]
  readonly completedAt: string | null
}

export class InvalidCompanyInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "InvalidCompanyInputError"
  }
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function normalizeCompanyInput(input: {
  name: string
  slug?: string
}): { name: string; slug: string } {
  const name = input.name.trim().replace(/\s+/g, " ")
  const slug = slugify(input.slug?.trim() || name)

  if (name.length < 2 || name.length > 80) {
    throw new InvalidCompanyInputError("O nome deve ter entre 2 e 80 caracteres")
  }
  if (slug.length < 2 || slug.length > 64) {
    throw new InvalidCompanyInputError("O endereço deve ter entre 2 e 64 caracteres")
  }

  return { name, slug }
}

export function validateOnboardingDraft(
  draft: CompanyOnboarding,
): readonly string[] {
  const missing: string[] = []
  if (!draft.draftName.trim()) missing.push("name")
  if (!draft.draftSlug.trim()) missing.push("slug")
  if (!draft.draftOperationType) missing.push("operationType")
  if (!draft.draftCity?.trim()) missing.push("city")
  if (!draft.draftCountry.trim()) missing.push("country")
  if (!draft.draftCurrency) missing.push("currency")
  return missing
}
