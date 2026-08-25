import type {
  Company,
  CompanyOnboarding,
  CompanyOperationType,
  CompanyRole,
} from "../domain/company"
import { normalizeCompanyInput, validateOnboardingDraft } from "../domain/company"
import type { CompanyRepository } from "../domain/repositories/company-repository"

export interface AuthorizedCompanyContext {
  readonly userId: string
  readonly role: CompanyRole
  readonly company: Company
}

export type SaveCompanyOnboardingStepInput =
  | {
      readonly expectedVersion: number
      readonly step: "IDENTITY"
      readonly values: { readonly name: string; readonly slug?: string }
    }
  | {
      readonly expectedVersion: number
      readonly step: "OPERATION"
      readonly values: {
        readonly operationType: CompanyOperationType
        readonly city: string
        readonly country: string
      }
    }
  | {
      readonly expectedVersion: number
      readonly step: "PREFERENCES"
      readonly values: { readonly currency: "BRL" | "USD" | "EUR" }
    }
  | {
      readonly expectedVersion: number
      readonly step: "REVIEW"
      readonly values: Record<string, never>
    }

export class OnboardingConflictError extends Error {
  constructor() {
    super("O onboarding foi atualizado em outra sessão")
    this.name = "OnboardingConflictError"
  }
}

export class OnboardingNotFoundError extends Error {
  constructor() {
    super("O progresso desta empresa não está disponível")
    this.name = "OnboardingNotFoundError"
  }
}

export class CompanyCapabilityDeniedError extends Error {
  constructor() {
    super("Sua função não permite alterar a configuração")
    this.name = "CompanyCapabilityDeniedError"
  }
}

export class WorkspaceNotReadyError extends Error {
  constructor() {
    super("Conclua a configuração antes de entrar no workspace")
    this.name = "WorkspaceNotReadyError"
  }
}

export class InvalidOnboardingInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "InvalidOnboardingInputError"
  }
}

export class IncompleteOnboardingError extends Error {
  constructor(readonly fields: readonly string[]) {
    super("Existem campos obrigatórios pendentes")
    this.name = "IncompleteOnboardingError"
  }
}

function assertCanManage(role: CompanyRole): void {
  if (role !== "OWNER" && role !== "ADMIN") {
    throw new CompanyCapabilityDeniedError()
  }
}

function appendCompletedStep(
  current: readonly CompanyOnboarding["currentStep"][],
  step: CompanyOnboarding["currentStep"],
): readonly CompanyOnboarding["currentStep"][] {
  return current.includes(step) ? current : [...current, step]
}

export async function readCompanyOnboarding(
  context: AuthorizedCompanyContext,
  repository: CompanyRepository,
): Promise<CompanyOnboarding> {
  const progress = await repository.readOnboarding(
    context.company.id,
    context.company.tenantId,
  )
  if (
    !progress ||
    progress.companyId !== context.company.id ||
    progress.tenantId !== context.company.tenantId
  ) {
    throw new OnboardingNotFoundError()
  }
  return progress
}

export async function saveCompanyOnboardingStep(
  context: AuthorizedCompanyContext,
  input: SaveCompanyOnboardingStepInput,
  repository: CompanyRepository,
): Promise<CompanyOnboarding> {
  assertCanManage(context.role)
  const current = await readCompanyOnboarding(context, repository)
  if (input.expectedVersion !== current.version) {
    throw new OnboardingConflictError()
  }
  if (input.step !== current.currentStep) {
    throw new InvalidOnboardingInputError("Esta etapa não está ativa")
  }

  let next: CompanyOnboarding
  switch (input.step) {
    case "IDENTITY": {
      const identity = normalizeCompanyInput(input.values)
      next = {
        ...current,
        draftName: identity.name,
        draftSlug: identity.slug,
        currentStep: "OPERATION",
        completedSteps: appendCompletedStep(current.completedSteps, "IDENTITY"),
        version: current.version + 1,
      }
      break
    }
    case "OPERATION": {
      const city = input.values.city.trim().replace(/\s+/g, " ")
      const country = input.values.country.trim().toUpperCase()
      if (city.length < 2 || !/^[A-Z]{2}$/.test(country)) {
        throw new InvalidOnboardingInputError("Informe cidade e país válidos")
      }
      next = {
        ...current,
        draftOperationType: input.values.operationType,
        draftCity: city,
        draftCountry: country,
        currentStep: "PREFERENCES",
        completedSteps: appendCompletedStep(current.completedSteps, "OPERATION"),
        version: current.version + 1,
      }
      break
    }
    case "PREFERENCES":
      next = {
        ...current,
        draftCurrency: input.values.currency,
        currentStep: "REVIEW",
        completedSteps: appendCompletedStep(current.completedSteps, "PREFERENCES"),
        version: current.version + 1,
      }
      break
    case "REVIEW":
      next = {
        ...current,
        completedSteps: appendCompletedStep(current.completedSteps, "REVIEW"),
        version: current.version + 1,
      }
      break
  }

  return repository.saveOnboarding({
    companyId: context.company.id,
    tenantId: context.company.tenantId,
    expectedVersion: current.version,
    next,
  })
}

export async function completeCompanyOnboarding(
  context: AuthorizedCompanyContext,
  input: { readonly expectedVersion: number },
  repository: CompanyRepository,
): Promise<{ company: Company; onboarding: CompanyOnboarding }> {
  assertCanManage(context.role)
  const progress = await readCompanyOnboarding(context, repository)
  if (
    context.company.status === "ACTIVE" &&
    progress.currentStep === "COMPLETED" &&
    progress.completedAt
  ) {
    return { company: context.company, onboarding: progress }
  }
  if (input.expectedVersion !== progress.version) {
    throw new OnboardingConflictError()
  }

  const fields = validateOnboardingDraft(progress)
  if (fields.length > 0) throw new IncompleteOnboardingError(fields)

  return repository.completeOnboarding({
    companyId: context.company.id,
    tenantId: context.company.tenantId,
    expectedVersion: progress.version,
    operationType: progress.draftOperationType!,
    city: progress.draftCity!,
    country: progress.draftCountry,
    currency: progress.draftCurrency,
  })
}

export async function requireWorkspaceCompany(
  context: AuthorizedCompanyContext,
  repository: CompanyRepository,
): Promise<Company> {
  const progress = await readCompanyOnboarding(context, repository)
  if (
    context.company.status !== "ACTIVE" ||
    progress.currentStep !== "COMPLETED" ||
    !progress.completedAt
  ) {
    throw new WorkspaceNotReadyError()
  }
  return context.company
}
