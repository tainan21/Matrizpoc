import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { createCompanyServices } from "../application/composition"
import { resolveSeumeiSession } from "./server-session"
import { ACTIVE_COMPANY_COOKIE } from "../application/active-company"

export async function requirePageSession() {
  const requestHeaders = await headers()
  const session = await resolveSeumeiSession(requestHeaders.get("cookie") ?? "")
  if (session.kind === "signed-out") redirect("/login")
  return session
}

export async function resolveCompanyPageFoundation() {
  const session = await requirePageSession()
  if (session.kind !== "authenticated") return { kind: "unavailable" } as const
  const services = createCompanyServices()
  if (services.kind === "unavailable") return { kind: "unavailable" } as const
  const cookieStore = await cookies()
  return {
    kind: "ready",
    actor: session.actor,
    services: services.services,
    preferredCompanyId: cookieStore.get(ACTIVE_COMPANY_COOKIE)?.value ?? "",
  } as const
}
