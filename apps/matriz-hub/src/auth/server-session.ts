import { cookies } from "next/headers"
import { MOCK_SESSION_COOKIE, mockAuthState } from "./mock-auth-server"

export async function hasActiveHubServerSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const hasCookie = cookieStore.get(MOCK_SESSION_COOKIE)?.value === "active"
  return hasCookie && mockAuthState.restoreSession() !== null
}
