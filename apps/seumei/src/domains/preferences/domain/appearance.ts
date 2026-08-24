import type { UserId } from "@matriz/foundation-types"

export type UserTheme = "dark" | "light" | "system"
export type NavigationPreference = "compact" | "expanded"

export interface UserAppearancePreference {
  readonly userId: UserId
  readonly theme: UserTheme
  readonly density: "compact" | "comfortable"
  readonly navigation: NavigationPreference
  readonly reducedMotion: boolean
}
