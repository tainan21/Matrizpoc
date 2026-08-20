import {
  CompanyAccessDeniedError,
  listAuthorizedCompanies,
  selectAuthorizedCompany,
} from "../application/company-access"
import {
  CompanyCapabilityDeniedError,
  IncompleteOnboardingError,
  InvalidOnboardingInputError,
  OnboardingConflictError,
  OnboardingNotFoundError,
  completeCompanyOnboarding,
  readCompanyOnboarding,
  saveCompanyOnboardingStep,
  type SaveCompanyOnboardingStepInput,
} from "../application/company-onboarding"
import {
  CompanyProvisioningUnavailableError,
  CompanySlugConflictError,
  InvalidIdempotencyKeyError,
  provisionCompany,
  type IdGenerator,
} from "../application/provision-company"
import { resolveActiveCompanyContext } from "../application/active-company"
import { InvalidCompanyInputError, type Company } from "../domain/company"
import type { SessionActor } from "../types/session-actor"
import type { CompanyRepository } from "../domain/repositories/company-repository"
import type { CompleteCoreAccessRepository } from "../domain/repositories/core-access-repository"
import {
  toCompanyChoiceViewModel,
  toOnboardingViewModel,
  toWorkspaceViewModel,
} from "../ui/presenters/company.presenter"
import type { SeumeiSessionResolution } from "../auth/server-session"

export interface CompanyHttpServices {
  readonly core: CompleteCoreAccessRepository
  readonly companies: CompanyRepository
  readonly ids: IdGenerator
  readonly events?: { companySelected(company: Company): void }
}

export interface HttpResult {
  readonly status: number
  readonly body: unknown
}

export async function withAuthenticatedSession(
  session: SeumeiSessionResolution,
  action: (actor: SessionActor) => Promise<HttpResult>,
): Promise<HttpResult> {
  if (session.kind === "signed-out") return { status: 401, body: { error: "unauthorized" } }
  if (session.kind === "unavailable") return { status: 503, body: { error: "session_unavailable" } }
  return action(session.actor)
}

function mappedError(error: unknown): HttpResult {
  if (error instanceof CompanyAccessDeniedError) {
    return { status: 403, body: { error: "company_forbidden" } }
  }
  if (error instanceof CompanyCapabilityDeniedError) {
    return { status: 403, body: { error: "capability_forbidden" } }
  }
  if (error instanceof OnboardingConflictError) {
    return { status: 409, body: { error: "onboarding_conflict" } }
  }
  if (error instanceof CompanySlugConflictError) {
    return { status: 409, body: { error: "company_slug_conflict" } }
  }
  if (error instanceof CompanyProvisioningUnavailableError) {
    return { status: 503, body: { error: "provisioning_unavailable", correlationId: error.correlationId } }
  }
  if (error instanceof OnboardingNotFoundError) {
    return { status: 404, body: { error: "onboarding_not_found" } }
  }
  if (error instanceof IncompleteOnboardingError) {
    return { status: 409, body: { error: "onboarding_incomplete", fields: error.fields } }
  }
  if (
    error instanceof InvalidIdempotencyKeyError ||
    error instanceof InvalidCompanyInputError ||
    error instanceof InvalidOnboardingInputError
  ) {
    return { status: 400, body: { error: "invalid_request" } }
  }
  return { status: 500, body: { error: "internal_error" } }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

export async function listCompaniesHandler(
  actor: SessionActor,
  services: CompanyHttpServices,
): Promise<HttpResult> {
  try {
    const user = await services.core.resolveUser(actor)
    const companies = await listAuthorizedCompanies(user.id, services.core, services.companies)
    return { status: 200, body: { companies: companies.map(toCompanyChoiceViewModel) } }
  } catch (error) {
    return mappedError(error)
  }
}

export async function createCompanyHandler(
  actor: SessionActor,
  body: unknown,
  services: CompanyHttpServices,
): Promise<HttpResult> {
  if (
    !isRecord(body) ||
    Object.hasOwn(body, "tenantId") ||
    typeof body.name !== "string" ||
    typeof body.idempotencyKey !== "string" ||
    (body.slug !== undefined && typeof body.slug !== "string")
  ) return { status: 400, body: { error: "invalid_request" } }
  try {
    const company = await provisionCompany(
      { name: body.name, slug: body.slug as string | undefined, idempotencyKey: body.idempotencyKey },
      actor,
      services.core,
      services.companies,
      services.ids,
    )
    return { status: 201, body: { company: toCompanyChoiceViewModel(company) } }
  } catch (error) {
    return mappedError(error)
  }
}

export async function selectCompanyHandler(
  actor: SessionActor,
  body: unknown,
  services: CompanyHttpServices,
): Promise<HttpResult> {
  if (!isRecord(body) || typeof body.companyId !== "string" || Object.hasOwn(body, "tenantId")) {
    return { status: 400, body: { error: "invalid_request" } }
  }
  try {
    const user = await services.core.resolveUser(actor)
    const selected = await selectAuthorizedCompany(
      { userId: user.id, companyId: body.companyId },
      services.core,
      services.companies,
    )
    services.events?.companySelected(selected.company)
    return { status: 200, body: { company: toCompanyChoiceViewModel(selected.company) } }
  } catch (error) {
    return mappedError(error)
  }
}

export async function readOnboardingHandler(
  actor: SessionActor,
  companyId: string,
  services: CompanyHttpServices,
): Promise<HttpResult> {
  try {
    const context = await resolveActiveCompanyContext(actor, companyId, services.core, services.companies)
    const onboarding = await readCompanyOnboarding(context, services.companies)
    return { status: 200, body: { onboarding: toOnboardingViewModel(context.company, onboarding) } }
  } catch (error) {
    return mappedError(error)
  }
}

export async function saveOnboardingHandler(
  actor: SessionActor,
  companyId: string,
  body: unknown,
  services: CompanyHttpServices,
): Promise<HttpResult> {
  if (
    !isRecord(body) || typeof body.expectedVersion !== "number" ||
    typeof body.step !== "string" || !isRecord(body.values) || Object.hasOwn(body, "tenantId")
  ) return { status: 400, body: { error: "invalid_request" } }
  try {
    const context = await resolveActiveCompanyContext(actor, companyId, services.core, services.companies)
    const onboarding = await saveCompanyOnboardingStep(
      context,
      body as unknown as SaveCompanyOnboardingStepInput,
      services.companies,
    )
    return { status: 200, body: { onboarding: toOnboardingViewModel(context.company, onboarding) } }
  } catch (error) {
    return mappedError(error)
  }
}

export async function completeOnboardingHandler(
  actor: SessionActor,
  companyId: string,
  body: unknown,
  services: CompanyHttpServices,
): Promise<HttpResult> {
  if (!isRecord(body) || typeof body.expectedVersion !== "number" || Object.hasOwn(body, "tenantId")) {
    return { status: 400, body: { error: "invalid_request" } }
  }
  try {
    const context = await resolveActiveCompanyContext(actor, companyId, services.core, services.companies)
    const completed = await completeCompanyOnboarding(
      context,
      { expectedVersion: body.expectedVersion },
      services.companies,
    )
    return { status: 200, body: { workspace: toWorkspaceViewModel(completed.company) } }
  } catch (error) {
    return mappedError(error)
  }
}
