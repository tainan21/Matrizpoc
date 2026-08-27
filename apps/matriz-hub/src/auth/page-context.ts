import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getHubRequestContext, HubAuthError, type HubRequestContext } from "./hub-session"

/** Server Component boundary for Hub pages that project tenant-owned data. */
export async function getHubPageRequestContext(): Promise<HubRequestContext> {
  const cookieJar = await cookies()
  try {
    return getHubRequestContext(new Request("http://matriz-hub.local", { headers: { cookie: cookieJar.toString() } }))
  } catch (error) {
    if (error instanceof HubAuthError) redirect("/login")
    throw error
  }
}
