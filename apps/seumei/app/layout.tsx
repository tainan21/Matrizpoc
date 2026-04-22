import type { Metadata } from "next"
import type { ReactNode } from "react"
import "./globals.css"
import { themeToCssVars, appThemes } from "@matriz/design-system"
import { BootstrapGuard } from "../src/ui/components/BootstrapGuard"
import { AppShell } from "../src/ui/components/AppShell"

export const metadata: Metadata = {
  title: "Seumei — Matriz",
  description: "App de estabelecimentos e operação do ecossistema Matriz.",
}

export default function SeumeiRootLayout({ children }: { children: ReactNode }) {
  const cssVars = themeToCssVars(appThemes.seumei)
  const styleVars = Object.entries(cssVars)
    .map(([k, v]) => `${k}: ${v};`)
    .join("\n")

  return (
    <html lang="pt-BR">
      <head>
        <style>{`:root { ${styleVars} }`}</style>
      </head>
      <body style={{ margin: 0, background: "var(--color-background)", color: "var(--color-foreground)" }}>
        <BootstrapGuard>
          <AppShell>{children}</AppShell>
        </BootstrapGuard>
      </body>
    </html>
  )
}
