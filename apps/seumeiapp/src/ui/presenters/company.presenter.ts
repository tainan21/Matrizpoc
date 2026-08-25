import type { Company, CompanyOnboarding } from "../../domain/company"

export interface CompanyChoiceViewModel {
  readonly id: string
  readonly name: string
  readonly slug: string
  readonly statusLabel: string
  readonly actionLabel: string
}

const STATUS_LABELS = {
  PROVISIONING: "Preparando empresa",
  ONBOARDING: "Configuração em andamento",
  ACTIVE: "Empresa ativa",
  PROVISIONING_FAILED: "Configuração interrompida",
} as const

const ACTION_LABELS = {
  PROVISIONING: "Aguardar preparação",
  ONBOARDING: "Continuar configuração",
  ACTIVE: "Abrir workspace",
  PROVISIONING_FAILED: "Tentar novamente",
} as const

export function toCompanyChoiceViewModel(
  company: Company,
): CompanyChoiceViewModel {
  return {
    id: company.id,
    name: company.name,
    slug: company.slug,
    statusLabel: STATUS_LABELS[company.status],
    actionLabel: ACTION_LABELS[company.status],
  }
}

export interface OnboardingViewModel {
  readonly companyName: string
  readonly companySlug: string
  readonly currentStep: CompanyOnboarding["currentStep"]
  readonly currentStepLabel: string
  readonly version: number
  readonly progressPercent: number
  readonly operationType: CompanyOnboarding["draftOperationType"]
  readonly city: string
  readonly country: string
  readonly currency: CompanyOnboarding["draftCurrency"]
}

const STEP_LABELS = {
  IDENTITY: "Identidade",
  OPERATION: "Operação",
  PREFERENCES: "Preferências",
  REVIEW: "Revisão",
  COMPLETED: "Concluído",
} as const

export function toOnboardingViewModel(
  company: Company,
  onboarding: CompanyOnboarding,
): OnboardingViewModel {
  return {
    companyName: company.name,
    companySlug: company.slug,
    currentStep: onboarding.currentStep,
    currentStepLabel: STEP_LABELS[onboarding.currentStep],
    version: onboarding.version,
    progressPercent: Math.min(100, onboarding.completedSteps.length * 25),
    operationType: onboarding.draftOperationType,
    city: onboarding.draftCity ?? "",
    country: onboarding.draftCountry,
    currency: onboarding.draftCurrency,
  }
}

export interface WorkspaceViewModel {
  readonly companyName: string
  readonly companySlug: string
  readonly operationLabel: string
  readonly locationLabel: string
}

const OPERATION_LABELS = {
  PHYSICAL_STORE: "Loja física",
  ONLINE_STORE: "Loja online",
  SERVICE: "Serviços",
  HYBRID: "Operação híbrida",
} as const

export function toWorkspaceViewModel(company: Company): WorkspaceViewModel {
  return {
    companyName: company.name,
    companySlug: company.slug,
    operationLabel: company.operationType
      ? OPERATION_LABELS[company.operationType]
      : "Operação não definida",
    locationLabel: company.city
      ? `${company.city} · ${company.country}`
      : company.country,
  }
}
