import type { Company } from "../domain/company"
import { DEMO_FEDERATION, requireDemoProvisioning } from "../domain/demo-federation"
import type { CompanyRepository } from "../domain/repositories/company-repository"
import type { CoreAccessRepository } from "../domain/repositories/core-access-repository"
import type { SessionActor } from "../types/session-actor"
import { provisionCompany } from "./provision-company"

const DEMO_COMPANY_IDENTITIES = {
  "galaxia-burger": {
    tenantId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    idempotencyKey: "11111111-1111-4111-8111-111111111111",
    city: "São Paulo",
  },
  "sabor-e-brasa": {
    tenantId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    idempotencyKey: "22222222-2222-4222-8222-222222222222",
    city: "Belo Horizonte",
  },
} as const

function actor(email: string, name: string): SessionActor {
  return { sessionUserId: `demo:${email}`, email, name }
}

async function completeDemoOnboarding(company: Company, companies: CompanyRepository): Promise<Company> {
  if (company.status === "ACTIVE") return company
  const onboarding = await companies.readOnboarding(company.id, company.tenantId)
  if (!onboarding) throw new Error("DEMO_ONBOARDING_NOT_FOUND")
  const completed = await companies.completeOnboarding({
    companyId: company.id,
    tenantId: company.tenantId,
    expectedVersion: onboarding.version,
    operationType: "PHYSICAL_STORE",
    city: DEMO_COMPANY_IDENTITIES[company.slug as keyof typeof DEMO_COMPANY_IDENTITIES].city,
    country: "BR",
    currency: "BRL",
  })
  return completed.company
}

export async function provisionDemoFederation(
  env: Readonly<Record<string, string | undefined>>,
  core: CoreAccessRepository,
  companies: CompanyRepository,
): Promise<{ readonly companies: readonly Company[]; readonly ownerUserId: string }> {
  requireDemoProvisioning(env)
  const globalActor = actor(DEMO_FEDERATION.global.email, DEMO_FEDERATION.global.displayName)
  const owner = await core.resolveUser(globalActor)
  const provisioned: Company[] = []

  for (const definition of DEMO_FEDERATION.companies) {
    const identity = DEMO_COMPANY_IDENTITIES[definition.slug as keyof typeof DEMO_COMPANY_IDENTITIES]
    const company = await provisionCompany(
      { name: definition.name, slug: definition.slug, idempotencyKey: identity.idempotencyKey },
      globalActor,
      core,
      companies,
      { tenantId: () => identity.tenantId },
    )
    provisioned.push(await completeDemoOnboarding(company, companies))
  }

  const operator = await core.resolveUser(actor(DEMO_FEDERATION.operator.email, DEMO_FEDERATION.operator.displayName))
  const galaxia = provisioned.find((company) => company.slug === "galaxia-burger")
  if (!galaxia) throw new Error("DEMO_GALAXIA_NOT_FOUND")
  await core.provisionMembership({ tenantId: galaxia.tenantId, userId: operator.id, role: "MEMBER" })

  return { companies: provisioned, ownerUserId: owner.id }
}
