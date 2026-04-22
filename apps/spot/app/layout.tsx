import type { Metadata } from "next"
import type { ReactNode } from "react"
import { themeToCssVars, appThemes } from "@matriz/design-system"
import { BootstrapGuard } from "../src/ui/components/BootstrapGuard"
import { SpotAuthAdoption } from "../src/auth/provider"
import { bootstrapSpot } from "../src/bootstrap"
import "./globals.css"

// Bootstrap tambem no server para apps que fazem render RSC.
bootstrapSpot()

export const metadata: Metadata = {
  title: "Spot",
  description: "App de bandas, artistas e gigs do ecossistema Matriz.",
}

export const viewport = {
  themeColor: appThemes.spot.brandAccent,
}

const spotVars = themeToCssVars(appThemes.spot)

export default function SpotRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" style={spotVars as Record<string, string>}>
      <body className="bg-surface text-surface-fg antialiased">
        <BootstrapGuard>
          <SpotAuthAdoption>{children}</SpotAuthAdoption>
        </BootstrapGuard>
      </body>
    </html>
  )
}
