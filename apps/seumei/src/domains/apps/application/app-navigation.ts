import { findAppDefinition } from "./app-registry"

export interface AppNavigationContribution {
  readonly id: string
  readonly label: string
  readonly href: string
  readonly icon?: string
}

export function buildAppNavigation(
  appId: string,
  appHref: string,
): readonly AppNavigationContribution[] {
  const definition = findAppDefinition(appId)
  if (!definition) return []
  return definition.navigation.map((item, index) => ({
    id: item.id,
    label: item.label,
    href: `${appHref}${item.path}`,
    ...(index === 0 ? { icon: definition.icon } : {}),
  }))
}
