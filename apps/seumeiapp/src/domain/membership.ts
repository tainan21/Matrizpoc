import type { CompanyRole } from "./company"

export type MembershipCapability =
  | "workspace.read"
  | "portfolio.read"
  | "catalog.read"
  | "catalog.manage"
  | "recipes.read"
  | "recipes.manage"
  | "stock.read"
  | "stock.manage"
  | "orders.read"
  | "orders.manage"
  | "customers.read"
  | "finance.read"
  | "finance.manage"
  | "store.design.read"
  | "store.design.manage"
  | "store.publish"
  | "members.read"
  | "members.invite.admin"
  | "members.invite.standard"
  | "members.role.manage.admin"
  | "members.role.manage.standard"
  | "members.remove.admin"
  | "members.remove.standard"

export interface CompanyMember {
  readonly id: string
  readonly userId: string
  readonly name: string
  readonly email: string
  readonly role: CompanyRole
  readonly joinedAt: string
}

export interface CompanyInvitation {
  readonly id: string
  readonly email: string
  readonly role: Exclude<CompanyRole, "OWNER">
  readonly expiresAt: string
  readonly createdAt: string
}

const OWNER_CAPABILITIES: readonly MembershipCapability[] = [
  "workspace.read",
  "portfolio.read",
  "catalog.read",
  "catalog.manage",
  "recipes.read",
  "recipes.manage",
  "stock.read",
  "stock.manage",
  "orders.read",
  "orders.manage",
  "customers.read",
  "finance.read",
  "finance.manage",
  "store.design.read",
  "store.design.manage",
  "store.publish",
  "members.read",
  "members.invite.admin",
  "members.invite.standard",
  "members.role.manage.admin",
  "members.role.manage.standard",
  "members.remove.admin",
  "members.remove.standard",
]

const ADMIN_CAPABILITIES: readonly MembershipCapability[] = [
  "workspace.read",
  "portfolio.read",
  "catalog.read",
  "catalog.manage",
  "recipes.read",
  "recipes.manage",
  "stock.read",
  "stock.manage",
  "orders.read",
  "orders.manage",
  "customers.read",
  "finance.read",
  "finance.manage",
  "store.design.read",
  "store.design.manage",
  "store.publish",
  "members.read",
  "members.invite.standard",
  "members.role.manage.standard",
  "members.remove.standard",
]

const ROLE_CAPABILITIES: Readonly<
  Record<CompanyRole, readonly MembershipCapability[]>
> = {
  OWNER: OWNER_CAPABILITIES,
  ADMIN: ADMIN_CAPABILITIES,
  MEMBER: ["workspace.read", "portfolio.read", "catalog.read", "recipes.read", "stock.read", "orders.read", "orders.manage", "customers.read"],
  VIEWER: ["workspace.read", "portfolio.read", "catalog.read", "recipes.read", "stock.read", "orders.read", "customers.read"],
}

export function can(
  role: CompanyRole,
  capability: MembershipCapability,
): boolean {
  return ROLE_CAPABILITIES[role].includes(capability)
}

function roleClass(role: CompanyRole): "owner" | "admin" | "standard" {
  if (role === "OWNER") return "owner"
  if (role === "ADMIN") return "admin"
  return "standard"
}

export function canInviteRole(
  actorRole: CompanyRole,
  invitedRole: CompanyRole,
): invitedRole is Exclude<CompanyRole, "OWNER"> {
  const target = roleClass(invitedRole)
  if (target === "owner") return false
  return can(
    actorRole,
    target === "admin" ? "members.invite.admin" : "members.invite.standard",
  )
}

export function canManageRole(
  actorRole: CompanyRole,
  targetRole: CompanyRole,
): boolean {
  const target = roleClass(targetRole)
  if (target === "owner") return false
  return can(
    actorRole,
    target === "admin"
      ? "members.role.manage.admin"
      : "members.role.manage.standard",
  )
}

export class InvalidInvitationEmailError extends Error {
  constructor() {
    super("Informe um e-mail válido com até 254 caracteres")
    this.name = "InvalidInvitationEmailError"
  }
}

export function normalizeInvitationEmail(value: string): string {
  const email = value.trim().toLowerCase()
  if (
    email.length === 0 ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new InvalidInvitationEmailError()
  }
  return email
}
