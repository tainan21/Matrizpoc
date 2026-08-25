import { asUserId } from "@matriz/foundation-types"

export const SEUMEI_DEMO_EMAIL = "demo@seumei.local" as const
export const SEUMEI_DEMO_FIXTURE_USER_ID = asUserId("user-demo-seumei")

export function isSeumeiDemoAccount(email: string): boolean {
  return email.trim().toLowerCase() === SEUMEI_DEMO_EMAIL
}
