import type { Metadata } from "next"
import type { ReactNode } from "react"
import { appThemes, themeToCssVars } from "@matriz/design-system"
import { BootstrapGuard } from "../src/ui/components/BootstrapGuard"
import "./globals.css"

export const metadata: Metadata = {
  title: "Matriz Contracts",
  description: "Gestao de contratos do ecossistema Matriz.",
}

export default function ContractsRootLayout({ children }: { children: ReactNode }) {
  const tokens = themeToCssVars(appThemes.contracts)
  return (
    <html lang="pt-BR" style={tokens}>
      <body
        style={{
          margin: 0,
          background: "var(--color-background)",
          color: "var(--color-foreground)",
          minHeight: "100vh",
        }}
      >
        <BootstrapGuard />
        {children}
      </body>
    </html>
  )
}
