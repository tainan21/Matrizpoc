import type { ReactNode } from "react"

export interface ShellUserViewModel { readonly name: string; readonly role: string; readonly onSignOut?: () => void }
export interface ShellCompanyViewModel { readonly name: string; readonly logoUrl: string; readonly accent: string }
export interface ShellAppViewModel { readonly id: string; readonly name: string; readonly icon: string; readonly href?: string }
export interface ShellNavigationItem { readonly id: string; readonly label: string; readonly href: string }
export interface SeumeiShellProps {
  readonly user: ShellUserViewModel
  readonly company: ShellCompanyViewModel | null
  readonly activeApp: ShellAppViewModel | null
  readonly apps: readonly ShellAppViewModel[]
  readonly navigation: readonly ShellNavigationItem[]
  readonly children: ReactNode
}
