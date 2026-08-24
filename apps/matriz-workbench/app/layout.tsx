import type { Metadata, Viewport } from "next"
import type { ReactNode } from "react"
import { cookies } from "next/headers"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { WorkbenchBootstrap } from "../src/bootstrap/provider"
import { normalizeAppearance, THEME_COOKIE, THEME_SYSTEM_COOKIE } from "../src/ui/theme"
import { getAppearanceVariables } from "../src/ui/theme-presets"
import { EcosystemAccess } from "@matriz/flows-ecosystem"

const sans = Geist({ subsets: ["latin"], variable: "--font-sans" })
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: { default: "Matriz Workbench", template: "%s · Matriz Workbench" },
  description: "Coworking local-first para o ecossistema Matriz.",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#070b13" },
    { media: "(prefers-color-scheme: light)", color: "#f7f7f8" },
  ],
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies()
  const appearance = normalizeAppearance(
    cookieStore.get(THEME_COOKIE)?.value,
    cookieStore.get(THEME_SYSTEM_COOKIE)?.value,
  )
  return (
    <html
      lang="pt-BR"
      className={`${sans.variable} ${mono.variable}`}
      data-matrizlib="0.1.0"
      data-theme={appearance.mode}
      data-system={appearance.system}
      style={getAppearanceVariables(appearance.mode, appearance.system)}
      suppressHydrationWarning
    >
      <body><EcosystemAccess appId="matriz-workbench" ownThemeControl /><WorkbenchBootstrap>{children}</WorkbenchBootstrap></body>
    </html>
  )
}
