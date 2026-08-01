import type { Metadata, Viewport } from "next"
import type { ReactNode } from "react"
import { cookies } from "next/headers"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { WorkbenchBootstrap } from "../src/bootstrap/provider"
import { normalizeTheme, THEME_COOKIE } from "../src/ui/theme"

const sans = Geist({ subsets: ["latin"], variable: "--font-sans" })
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: { default: "Matriz Workbench", template: "%s · Matriz Workbench" },
  description: "Coworking local-first para o ecossistema Matriz.",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f7f7f8",
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const theme = normalizeTheme((await cookies()).get(THEME_COOKIE)?.value)
  return (
    <html
      lang="pt-BR"
      className={`${sans.variable} ${mono.variable}`}
      data-theme={theme}
      suppressHydrationWarning
    >
      <body><WorkbenchBootstrap>{children}</WorkbenchBootstrap></body>
    </html>
  )
}
