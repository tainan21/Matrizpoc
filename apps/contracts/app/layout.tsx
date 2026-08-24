import type { Metadata } from "next"
import type { ReactNode } from "react"
import { appThemes, themeToCssVars } from "@matriz/design-system"
import { ThemeController } from "@matriz/design-ui"
import { BootstrapGuard } from "../src/ui/components/BootstrapGuard"
import { ContractsAuthAdoption } from "../src/auth/provider"
import { EcosystemAccess } from "@matriz/flows-ecosystem"
import "./globals.css"

export const metadata: Metadata = {
  title: "Matriz Contracts",
  description: "Gestao de contratos do ecossistema Matriz.",
}

export default function ContractsRootLayout({ children }: { children: ReactNode }) {
  const tokens = themeToCssVars(appThemes.contracts)
  return (
    <html lang="pt-BR" data-matrizlib="0.1.0" data-theme="light" style={tokens}>
      <body
        style={{
          margin: 0,
          background: "var(--color-background)",
          color: "var(--color-foreground)",
          minHeight: "100vh",
        }}
      >
        <ThemeController appId="contracts" />
        <EcosystemAccess appId="contracts" />
        <BootstrapGuard />
        <ContractsAuthAdoption>{children}</ContractsAuthAdoption>
      </body>
    </html>
  )
}
