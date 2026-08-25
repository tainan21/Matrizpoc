import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Health",
  description: "Observabilidade local leve para recursos e processos do Windows.",
}

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return <html lang="pt-BR"><body>{children}</body></html>
}
