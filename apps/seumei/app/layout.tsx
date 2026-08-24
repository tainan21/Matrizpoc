import type { Metadata } from "next"
import type { ReactNode } from "react"
import "./globals.css"
import { themeToCssVars, darkAppThemes } from "@matriz/design-system"
import { ThemeController } from "@matriz/design-ui"
import { BootstrapGuard } from "../src/ui/components/BootstrapGuard"
import { SeumeiAuthAdoption } from "../src/auth/provider"
import { EcosystemAccess } from "@matriz/flows-ecosystem"

export const metadata: Metadata = {
  title: "Seumei — Matriz",
  description: "App de estabelecimentos e operação do ecossistema Matriz.",
}

export default function SeumeiRootLayout({ children }: { children: ReactNode }) {
  const cssVars = themeToCssVars(darkAppThemes.seumei)
  const styleVars = Object.entries(cssVars)
    .map(([k, v]) => `${k}: ${v};`)
    .join("\n")

  return (
    <html lang="pt-BR" data-matrizlib="0.1.0" data-theme="dark">
      <head>
        <style>{`:root { ${styleVars} }`}</style>
      </head>
      <body style={{ margin: 0, background: "var(--color-background)", color: "var(--color-foreground)" }}>
        <ThemeController appId="seumei" />
        <EcosystemAccess appId="seumei" />
        <BootstrapGuard>
          <SeumeiAuthAdoption>{children}</SeumeiAuthAdoption>
        </BootstrapGuard>
      </body>
    </html>
  )
}
