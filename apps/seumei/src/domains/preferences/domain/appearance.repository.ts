import type { UserId } from "@matriz/foundation-types"
import type { UserAppearancePreference } from "./appearance"

export interface AppearanceRepository {
  getForUser(userId: UserId): Promise<UserAppearancePreference | null>
}
