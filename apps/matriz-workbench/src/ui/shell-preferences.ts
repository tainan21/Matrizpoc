export type RailPreference = "expanded" | "collapsed"
export type TopbarPreference = "auto" | "pinned"

export const RAIL_PREFERENCE_COOKIE = "matriz-workbench-rail"
export const TOPBAR_PREFERENCE_COOKIE = "matriz-workbench-topbar"

const COOKIE_ATTRIBUTES = "Path=/; Max-Age=31536000; SameSite=Strict"

export function normalizeRailPreference(value: string | undefined): RailPreference {
  return value === "expanded" || value === "collapsed" ? value : "collapsed"
}

export function normalizeTopbarPreference(value: string | undefined): TopbarPreference {
  return value === "auto" || value === "pinned" ? value : "auto"
}

export function createRailPreferenceCookie(value: RailPreference): string {
  return `${RAIL_PREFERENCE_COOKIE}=${value}; ${COOKIE_ATTRIBUTES}`
}

export function createTopbarPreferenceCookie(value: TopbarPreference): string {
  return `${TOPBAR_PREFERENCE_COOKIE}=${value}; ${COOKIE_ATTRIBUTES}`
}

export function selectActiveShellHref(
  pathname: string,
  destinations: readonly string[],
): string | undefined {
  return destinations
    .filter((href) =>
      href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`),
    )
    .sort((left, right) => right.length - left.length)[0]
}

export function canAutoHideTopbar(capabilities: {
  hover: boolean
  finePointer: boolean
  reducedMotion: boolean
  smallViewport: boolean
}): boolean {
  return capabilities.hover &&
    capabilities.finePointer &&
    !capabilities.reducedMotion &&
    !capabilities.smallViewport
}
