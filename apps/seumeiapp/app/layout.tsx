import type { Metadata } from "next"
import type { ReactNode } from "react"
import { appThemes, themeToCssVars } from "@matriz/design-system"
import { EcosystemAccess } from "@matriz/flows-ecosystem"
import { ThemeController } from "@matriz/design-ui"
import { SeumeiAuthShell } from "../src/ui/AuthShell"
import "./globals.css"

export const metadata: Metadata = { title: "Seumei", description: "Sua empresa no ecossistema Matriz." }
export default function RootLayout({ children }: { children: ReactNode }) {
  const vars = Object.entries(themeToCssVars(appThemes.seumei)).map(([key, value]) => `${key}:${value}`).join(";")
  return <html lang="pt-BR" data-matrizlib="0.1.0" data-theme="light"><head><style>{`:root{${vars}}`}</style></head>
    <body><ThemeController appId="seumei" /><EcosystemAccess appId="seumei" /><SeumeiAuthShell>{children}</SeumeiAuthShell></body>
  </html>
}
