import type { Metadata } from "next"

import { ThemeController } from "@matriz/design-ui"
import { MatrizLibBootstrapProvider } from "../src/bootstrap/bootstrap-provider"
import { SiteFooter } from "../src/ui/site-footer"
import { SiteHeader } from "../src/ui/site-header"
import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: "MatrizLib — contratos visuais públicos",
    template: "%s · MatrizLib",
  },
  description:
    "Referência pública para componentes, temas e sons do ecossistema Matriz.",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html data-matrizlib="0.1.0" lang="pt-BR" suppressHydrationWarning>
      <body id="top">
        <MatrizLibBootstrapProvider>
          <ThemeController appId="matrizlib" />
          <SiteHeader />
          {children}
          <SiteFooter />
        </MatrizLibBootstrapProvider>
      </body>
    </html>
  )
}
