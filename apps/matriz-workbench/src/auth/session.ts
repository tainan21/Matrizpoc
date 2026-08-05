import "server-only"

import { timingSafeEqual } from "node:crypto"
import { cookies } from "next/headers"
import {
  getRequiredLocalToken,
  localSessionDigest,
  localTokenMatches,
} from "./local-access"

export const SESSION_COOKIE = "matriz_workbench_session"

export { getRequiredLocalToken }

export function sessionDigest(): string {
  return localSessionDigest()
}

export function tokenMatches(candidate: string): boolean {
  return localTokenMatches(candidate)
}

export async function isUnlocked(): Promise<boolean> {
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value
  if (!cookie) return false
  const expected = Buffer.from(sessionDigest())
  const received = Buffer.from(cookie)
  return expected.length === received.length && timingSafeEqual(expected, received)
}
