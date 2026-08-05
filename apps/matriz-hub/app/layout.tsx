import type { Metadata } from "next"
import type { ReactNode } from "react"
import { themeToCssVars, appThemes } from "@matriz/design-system"
import { ThemeController } from "@matriz/design-ui"
import { bootstrapMatrizHub } from "../src/bootstrap"
import { HubAuthAdoption } from "../src/auth/provider"
import { EcosystemAccess } from "@matriz/flows-ecosystem"
import "./globals.css"

bootstrapMatrizHub()

export const metadata: Metadata = {
  title: "Matriz Hub",
  description: "Ponto central de entrada do ecossistema Matriz.",
}

export const viewport = {
  themeColor: "#0f172a",
}

const hubVars = themeToCssVars(appThemes["matriz-hub"])

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" data-theme="light" style={hubVars as Record<string, string>}>
      <body
        style={{
          margin: 0,
          fontFamily:
            "var(--font-sans, system-ui), -apple-system, BlinkMacSystemFont, sans-serif",
          background: "var(--color-background)",
          color: "var(--color-foreground)",
          minHeight: "100vh",
        }}
      >
        <ThemeController appId="matriz-hub" />
        <EcosystemAccess appId="matriz-hub" />
        <HubAuthAdoption>{children}</HubAuthAdoption>
      </body>
    </html>
  )
}
