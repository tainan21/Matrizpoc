import type { SeumeiAppDefinition } from "../../apps/domain/app"
import type { Company } from "../../companies/domain/company"
import type { Membership } from "../../memberships/domain/membership"
import type { UserAppearancePreference } from "../../preferences/domain/appearance"

export interface HubAppViewModel {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly icon: string
  readonly href: string
}

export interface HubCompanyViewModel {
  readonly id: string
  readonly slug: string
  readonly name: string
  readonly legalName: string
  readonly segment: string
  readonly statusLabel: string
  readonly roleLabel: string
  readonly logoUrl: string
  readonly coverUrl: string
  readonly accent: string
  readonly href: string
  readonly appCountLabel: string
  readonly apps: readonly HubAppViewModel[]
}

export interface HubViewModel {
  readonly companies: readonly HubCompanyViewModel[]
  readonly appearance: UserAppearancePreference | null
  readonly emptyState: {
    readonly title: string
    readonly description: string
  } | null
}

const ROLE_LABELS: Readonly<Record<Membership["role"], string>> = {
  owner: "Proprietário",
  admin: "Administrador",
  member: "Membro",
  guest: "Convidado",
}

export function toHubCompanyViewModel(input: {
  readonly company: Company
  readonly membership: Membership
  readonly apps: readonly SeumeiAppDefinition[]
}): HubCompanyViewModel {
  const companyHref = `/c/${input.company.slug}`
  return {
    id: input.company.id,
    slug: input.company.slug,
    name: input.company.branding.displayName,
    legalName: input.company.legalName,
    segment: input.company.segment,
    statusLabel: input.company.status === "active" ? "Ativa" : "Em configuração",
    roleLabel: ROLE_LABELS[input.membership.role],
    logoUrl: input.company.branding.logoUrl,
    coverUrl: input.company.branding.coverUrl,
    accent: input.company.branding.accent,
    href: companyHref,
    appCountLabel: `${input.apps.length} ${input.apps.length === 1 ? "aplicativo" : "aplicativos"} instalados`,
    apps: input.apps.map((app) => ({
      id: app.id,
      name: app.name,
      description: app.description,
      icon: app.icon,
      href: `${companyHref}/apps/${app.id}`,
    })),
  }
}
