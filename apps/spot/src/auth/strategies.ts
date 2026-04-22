/**
 * Spot adopts OTP as the default sign-in strategy. To add a second
 * strategy (e.g. magic link fallback), push another factory call here —
 * the first one in the array stays the default.
 */
import { createOtpStrategy } from "@matriz/platform-auth"
import type { SignInStrategy } from "@matriz/platform-auth"

export const spotStrategies: readonly SignInStrategy[] = [createOtpStrategy()]
