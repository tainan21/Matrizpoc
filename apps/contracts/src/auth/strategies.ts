import { createMagicLinkStrategy } from "@matriz/platform-auth"
import type { SignInStrategy } from "@matriz/platform-auth"

export const contractsStrategies: readonly SignInStrategy[] = [createMagicLinkStrategy()]
