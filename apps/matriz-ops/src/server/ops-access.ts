export type OpsAccessReason = "app-binding" | "operator-required"

export type OpsOidcSession = {
  readonly session: {
    readonly identity: { readonly user: { readonly id: string; readonly name: string; readonly email: string } }
    readonly issuedAt: string
  }
  readonly context: { readonly userId: string; readonly appId: string }
}

export type OpsOperator = {
  readonly role: string
  readonly active: boolean
  readonly revokedAt: Date | null
}

export type OpsPrincipal = {
  readonly session: {
    readonly userId: string
    readonly issuedAt: Date
    readonly user: { readonly email: string; readonly displayName: string }
  }
  readonly operator: OpsOperator
}

export type OpsAccess =
  | { readonly state: "anonymous" }
  | { readonly state: "denied"; readonly reason: OpsAccessReason }
  | { readonly state: "authorized"; readonly principal: OpsPrincipal }

export function resolveOpsAccess(oidc: OpsOidcSession | null, operator: OpsOperator | null): OpsAccess {
  if (!oidc) return { state: "anonymous" }
  if (oidc.context.appId !== "matriz-ops") return { state: "denied", reason: "app-binding" }
  if (!operator?.active || operator.revokedAt) return { state: "denied", reason: "operator-required" }
  return {
    state: "authorized",
    principal: {
      session: {
        userId: oidc.context.userId,
        issuedAt: new Date(oidc.session.issuedAt),
        user: {
          email: oidc.session.identity.user.email,
          displayName: oidc.session.identity.user.name,
        },
      },
      operator,
    },
  }
}
