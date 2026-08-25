import { createOtpStrategy } from "@matriz/platform-auth"
import type { SignInStrategy } from "@matriz/platform-auth"

export const seumeiStrategies: readonly SignInStrategy[] = [createOtpStrategy()]
