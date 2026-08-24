import type { UserId } from "@matriz/foundation-types"
import type { UserAppearancePreference } from "../domains/preferences/domain/appearance"

export function createFixtureAppearance(
  demoUserId: UserId,
): UserAppearancePreference {
  return {
    userId: demoUserId,
    theme: "dark",
    density: "compact",
    navigation: "compact",
    reducedMotion: false,
  }
}
