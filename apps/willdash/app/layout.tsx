import type { Metadata } from "next"
import type { ReactNode } from "react"
import { appThemes, themeToCssVars } from "@matriz/design-system"
import { BootstrapGuard } from "../src/ui/components/BootstrapGuard"
import { WilldashAuthAdoption } from "../src/auth/provider"
import "./globals.css"

export const metadata: Metadata = {
  title: "Matriz Willdash",
  description: "Telemetria e dashboards agregados do ecossistema Matriz.",
}

export default function WilldashRootLayout({ children }: { children: ReactNode }) {
  const tokens = themeToCssVars(appThemes.willdash)
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
        <WilldashAuthAdoption>{children}</WilldashAuthAdoption>
      </body>
    </html>
  )
}
