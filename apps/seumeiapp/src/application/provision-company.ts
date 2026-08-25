import { randomUUID } from "node:crypto"
import type { Company } from "../domain/company"
import type { SessionActor } from "../types/session-actor"
import { normalizeCompanyInput } from "../domain/company"
import type { CompanyRepository } from "../domain/repositories/company-repository"
import type { CoreAccessRepository } from "../domain/repositories/core-access-repository"

export interface ProvisionCompanyInput {
  readonly name: string
  readonly slug?: string
  readonly idempotencyKey: string
}

export interface IdGenerator {
  tenantId(): string
}

export class InvalidIdempotencyKeyError extends Error {
  constructor() {
    super("A chave de idempotência é inválida")
    this.name = "InvalidIdempotencyKeyError"
  }
}

export class CompanySlugConflictError extends Error {
  constructor() {
    super("Este endereço de empresa já está em uso")
    this.name = "CompanySlugConflictError"
  }
}

export class CompanyProvisioningUnavailableError extends Error {
  constructor(readonly correlationId: string) {
    super("Não foi possível preparar a empresa agora")
    this.name = "CompanyProvisioningUnavailableError"
  }
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function provisionCompany(
  input: ProvisionCompanyInput,
  actor: SessionActor,
  core: CoreAccessRepository,
  companies: CompanyRepository,
  ids: IdGenerator,
): Promise<Company> {
  if (!UUID_PATTERN.test(input.idempotencyKey)) {
    throw new InvalidIdempotencyKeyError()
  }

  const identity = normalizeCompanyInput(input)
  const user = await core.resolveUser(actor)
  const existing = await companies.findByActorIdempotency(
    user.id,
    input.idempotencyKey,
  )
  if (existing && existing.status !== "PROVISIONING_FAILED") return existing

  const createdThisAttempt = !existing
  const provisional =
    existing ??
    (await companies.createProvisioning({
      tenantId: ids.tenantId(),
      name: identity.name,
      slug: identity.slug,
      createdByUserId: user.id,
      idempotencyKey: input.idempotencyKey,
    }))

  let coreProvisioned = false
  try {
    await core.provisionOwner({
      tenantId: provisional.tenantId,
      tenantName: provisional.name,
      tenantSlug: provisional.slug,
      userId: user.id,
    })
    coreProvisioned = true
    return await companies.markOnboarding(
      provisional.id,
      provisional.tenantId,
    )
  } catch {
    let compensationFailed = false

    if (coreProvisioned) {
      try {
        await core.removeProvisionedTenant({
          tenantId: provisional.tenantId,
          userId: user.id,
        })
      } catch {
        compensationFailed = true
      }
    }

    if (createdThisAttempt && !compensationFailed) {
      try {
        await companies.removeProvisioning(
          provisional.id,
          provisional.tenantId,
        )
      } catch {
        compensationFailed = true
      }
    } else {
      compensationFailed = true
    }

    if (compensationFailed) {
      try {
        await companies.markProvisioningFailed(
          provisional.id,
          provisional.tenantId,
        )
      } catch {
        // The sanitized error below is the only outward-facing detail.
      }
    }

    throw new CompanyProvisioningUnavailableError(randomUUID())
  }
}
