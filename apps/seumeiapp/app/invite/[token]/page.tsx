import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { InvitationUnavailableError, readCompanyInvitation } from "../../../src/application/company-memberships"
import { createCompanyServices } from "../../../src/application/composition"
import { safeReturnPath } from "../../../src/application/safe-return-path"
import { resolveSeumeiSession } from "../../../src/auth/server-session"
import { InvitationAcceptance } from "../../../src/ui/InvitationAcceptance"
import { SystemState } from "../../../src/ui/SystemState"
import { toInvitationViewModel } from "../../../src/ui/presenters/membership.presenter"

export default async function InvitationPage({
  params,
}: {
  readonly params: Promise<{ readonly token: string }>
}) {
  const { token } = await params
  const validToken = /^[A-Za-z0-9_-]{8,128}$/.test(token)
  const requestHeaders = await headers()
  const session = await resolveSeumeiSession(requestHeaders.get("cookie") ?? "")
  if (session.kind === "signed-out") {
    const returnTo = safeReturnPath(`/invite/${validToken ? token : "invalid"}`)
    redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`)
  }
  if (session.kind === "unavailable") return <SystemState kind="unavailable" />
  if (!validToken) return <InvitationAcceptance token="invalid" invitation={null} />

  const services = createCompanyServices()
  if (services.kind === "unavailable") return <SystemState kind="unavailable" />
  try {
    const [user, invitation] = await Promise.all([
      services.services.core.resolveUser(session.actor),
      readCompanyInvitation(token, services.services.core, services.services.companies),
    ])
    return <InvitationAcceptance token={token} invitation={toInvitationViewModel(invitation, user.email)} />
  } catch (error) {
    if (error instanceof InvitationUnavailableError) {
      return <InvitationAcceptance token={token} invitation={null} />
    }
    return <SystemState kind="unavailable" />
  }
}
