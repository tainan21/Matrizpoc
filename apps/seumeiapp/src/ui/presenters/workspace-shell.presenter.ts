import type { Company, CompanyRole } from "../../domain/company"
import { can } from "../../domain/membership"

export interface WorkspaceShellViewModel {
  readonly companyName: string
  readonly roleLabel: string
  readonly navigation: readonly {
    readonly label: string
    readonly href: string
  }[]
}

const ROLE_LABELS: Readonly<Record<CompanyRole, string>> = {
  OWNER: "Proprietário",
  ADMIN: "Administrador",
  MEMBER: "Membro",
  VIEWER: "Leitor",
}

export function toWorkspaceShellViewModel(
  company: Company,
  role: CompanyRole,
): WorkspaceShellViewModel {
  const navigation = [{ label: "Visão geral", href: "/workspace" }]
  navigation.push({ label: "Produtos", href: "/workspace/products" })
  if (can(role, "members.read")) {
    navigation.push({ label: "Membros", href: "/workspace/members" })
  }
  navigation.push({ label: "Route flows · temporário", href: "/docs" })
  return { companyName: company.name, roleLabel: ROLE_LABELS[role], navigation }
}
