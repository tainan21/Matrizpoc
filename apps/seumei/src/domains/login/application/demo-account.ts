export const SEUMEI_DEMO_EMAIL = "demo@seumei.local" as const

export function isSeumeiDemoAccount(email: string): boolean {
  return email.trim().toLowerCase() === SEUMEI_DEMO_EMAIL
}
