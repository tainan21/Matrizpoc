import type { ReactNode } from "react"
import { MatrizAuthLayout } from "@matriz/design-ui"

export function LoginLayoutFrame({ children }: { children: ReactNode }) {
  return (
    <MatrizAuthLayout
      appId="spot"
      product="Spot"
      productLabel="Bandas & gigs"
      mark="S"
      eyebrow="Próximo palco"
      headline="Da ideia ao palco, sem perder o ritmo."
      description="Organize bandas, gigs e bookings em um fluxo preparado para o próximo show."
      panelTitle="Entre no Spot."
      footer="OTP seguro · identidade Spot · base Matriz"
    >
      {children}
    </MatrizAuthLayout>
  )
}
