import type { UserId } from "@matriz/foundation-types"
import { authorizeAppAccess } from "../../apps/application/app-access.policy"
import { findAppDefinition } from "../../apps/application/app-registry"
import type { SeumeiAppDefinition, SeumeiAppId } from "../../apps/domain/app"
import type { CompanyId } from "../../companies/domain/company"
import { resolveTenantContext } from "../../memberships/application/resolve-tenant-context"
import type { SeumeiTenantContext } from "../../memberships/domain/tenant-context"
import type { UserAppearancePreference } from "../../preferences/domain/appearance"
import type { BusinessOsRepositories } from "../../../mock/business-os.repositories"
import {
  toHubCompanyViewModel,
  type HubCompanyViewModel,
  type HubViewModel,
} from "../presentation/hub.presenter"

export type BusinessOsOpenError =
  | "company-not-found"
  | "membership-required"
  | "membership-disabled"
  | "app-not-found"
  | "app-not-installed"
  | "permission-denied"

export interface CompanyWorkspace {
  readonly context: SeumeiTenantContext
  readonly company: HubCompanyViewModel
  readonly appearance: UserAppearancePreference | null
}

export interface BusinessOsService {
  getHub(userId: UserId): Promise<HubViewModel>
  openCompany(
    userId: UserId,
    companyId: CompanyId,
  ): Promise<
    | { readonly ok: true; readonly workspace: CompanyWorkspace }
    | { readonly ok: false; readonly error: BusinessOsOpenError }
  >
  openCompanyBySlug(
    userId: UserId,
    slug: string,
  ): Promise<
    | { readonly ok: true; readonly workspace: CompanyWorkspace }
    | { readonly ok: false; readonly error: BusinessOsOpenError }
  >
  authorizeApp(
    context: SeumeiTenantContext,
    appId: string,
  ): Promise<
    | { readonly ok: true; readonly definition: SeumeiAppDefinition }
    | { readonly ok: false; readonly error: BusinessOsOpenError }
  >
}

export function createBusinessOsService(
  repositories: BusinessOsRepositories,
): BusinessOsService {
  async function authorizedDefinitions(context: SeumeiTenantContext) {
    const installed = await repositories.installedApps.list(context)
    return installed.flatMap((installation) => {
      const definition = findAppDefinition(installation.appId)
      if (!definition) return []
      const decision = authorizeAppAccess({ context, definition, installed: installation })
      return decision.ok ? [definition] : []
    })
  }

  async function getHub(userId: UserId): Promise<HubViewModel> {
    const memberships = await repositories.memberships.listForUser(userId)
    const companies = await repositories.companies.listForMemberships(userId, memberships)
    const companyModels = await Promise.all(
      companies.map(async (company) => {
        const membership = memberships.find(
          (candidate) => candidate.companyId === company.id,
        )!
        const resolution = await resolveTenantContext({
          userId,
          requestedCompanyId: company.id,
          memberships: repositories.memberships,
        })
        if (!resolution.ok) return null
        return toHubCompanyViewModel({
          company,
          membership,
          apps: await authorizedDefinitions(resolution.context),
        })
      }),
    )
    const visibleCompanies = companyModels.filter(
      (company): company is HubCompanyViewModel => Boolean(company),
    )
    return {
      companies: visibleCompanies,
      appearance: await repositories.appearance.getForUser(userId),
      emptyState:
        visibleCompanies.length === 0
          ? {
              title: "Nenhuma empresa disponível",
              description:
                "Esta conta ainda não possui memberships ativas no Seumei.",
            }
          : null,
    }
  }

  async function openCompany(userId: UserId, companyId: CompanyId) {
    const resolution = await resolveTenantContext({
      userId,
      requestedCompanyId: companyId,
      memberships: repositories.memberships,
    })
    if (!resolution.ok) return resolution
    const company = await repositories.companies.getCurrent(resolution.context)
    if (!company) return { ok: false as const, error: "company-not-found" as const }
    const membership = await repositories.memberships.find(userId, companyId)
    if (!membership) return { ok: false as const, error: "membership-required" as const }
    return {
      ok: true as const,
      workspace: {
        context: resolution.context,
        company: toHubCompanyViewModel({
          company,
          membership,
          apps: await authorizedDefinitions(resolution.context),
        }),
        appearance: await repositories.appearance.getForUser(userId),
      },
    }
  }

  return {
    getHub,
    openCompany,
    async openCompanyBySlug(userId, slug) {
      const memberships = await repositories.memberships.listForUser(userId)
      const company = await repositories.companies.findBySlugForMemberships(
        userId,
        slug,
        memberships,
      )
      if (!company) return { ok: false, error: "company-not-found" }
      return openCompany(userId, company.id)
    },
    async authorizeApp(context, appId) {
      const definition = findAppDefinition(appId)
      if (!definition) return { ok: false, error: "app-not-found" }
      const installed = await repositories.installedApps.find(
        context,
        appId as SeumeiAppId,
      )
      const decision = authorizeAppAccess({ context, definition, installed })
      return decision.ok
        ? { ok: true, definition }
        : { ok: false, error: decision.error }
    },
  }
}
