import type { UserId } from "@matriz/foundation-types"
import type { InstalledAppRepository } from "../domains/apps/domain/installed-app.repository"
import type { CompanyRepository } from "../domains/companies/domain/company.repository"
import type { MembershipRepository } from "../domains/memberships/domain/membership.repository"
import type { AppearanceRepository } from "../domains/preferences/domain/appearance.repository"
import { FIXTURE_COMPANIES } from "../fixtures/companies"
import { FIXTURE_INSTALLED_APPS } from "../fixtures/installed-apps"
import { createFixtureMemberships } from "../fixtures/memberships"
import { createFixtureAppearance } from "../fixtures/preferences"

export interface BusinessOsRepositories {
  readonly companies: CompanyRepository
  readonly memberships: MembershipRepository
  readonly installedApps: InstalledAppRepository
  readonly appearance: AppearanceRepository
}

export function createBusinessOsRepositories(input: {
  readonly demoUserId: UserId
}): BusinessOsRepositories {
  const membershipsData = createFixtureMemberships(input.demoUserId)
  const appearanceData = createFixtureAppearance(input.demoUserId)

  function validMembershipIds(userId: UserId, memberships: typeof membershipsData) {
    return new Set(
      memberships
        .filter((membership) => membership.userId === userId && membership.status === "active")
        .map((membership) => membership.companyId),
    )
  }

  const memberships: MembershipRepository = {
    async listForUser(userId) {
      return membershipsData.filter((membership) => membership.userId === userId)
    },
    async find(userId, companyId) {
      return (
        membershipsData.find(
          (membership) =>
            membership.userId === userId && membership.companyId === companyId,
        ) ?? null
      )
    },
  }

  const companies: CompanyRepository = {
    async listForMemberships(userId, requestedMemberships) {
      const ids = validMembershipIds(userId, requestedMemberships as typeof membershipsData)
      return FIXTURE_COMPANIES.filter((company) => ids.has(company.id))
    },
    async findBySlugForMemberships(userId, slug, requestedMemberships) {
      const ids = validMembershipIds(userId, requestedMemberships as typeof membershipsData)
      return (
        FIXTURE_COMPANIES.find(
          (company) => company.slug === slug && ids.has(company.id),
        ) ?? null
      )
    },
    async getCurrent(context) {
      const valid = membershipsData.some(
        (membership) =>
          membership.id === context.membershipId &&
          membership.userId === context.userId &&
          membership.companyId === context.companyId &&
          membership.status === "active",
      )
      if (!valid) return null
      return FIXTURE_COMPANIES.find((company) => company.id === context.companyId) ?? null
    },
  }

  function contextIsValid(context: Parameters<InstalledAppRepository["list"]>[0]) {
    return membershipsData.some(
      (membership) =>
        membership.id === context.membershipId &&
        membership.userId === context.userId &&
        membership.companyId === context.companyId &&
        membership.status === "active",
    )
  }

  const installedApps: InstalledAppRepository = {
    async list(context) {
      if (!contextIsValid(context)) return []
      return FIXTURE_INSTALLED_APPS.filter(
        (app) => app.companyId === context.companyId && app.status === "active",
      )
    },
    async find(context, appId) {
      if (!contextIsValid(context)) return null
      return (
        FIXTURE_INSTALLED_APPS.find(
          (app) =>
            app.companyId === context.companyId &&
            app.appId === appId &&
            app.status === "active",
        ) ?? null
      )
    },
  }

  const appearance: AppearanceRepository = {
    async getForUser(userId) {
      return appearanceData.userId === userId ? appearanceData : null
    },
  }

  return { companies, memberships, installedApps, appearance }
}
