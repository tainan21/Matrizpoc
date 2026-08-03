import type { ReactNode } from "react"
import { MatrizAuthLayout } from "@matriz/design-ui"

export function LoginLayoutFrame({ children }: { children: ReactNode }) {
  return (
    <MatrizAuthLayout
      appId="seumei"
      product="Seumei"
      productLabel="Operação"
      mark="S"
      eyebrow="Operação em movimento"
      headline="Seu negócio aberto para o que vem."
      description="Acompanhe estabelecimentos, regiões e rotinas com clareza para decidir no tempo da operação."
      panelTitle="Acesse sua operação."
      footer="OTP operacional · sessão protegida · base Matriz"
    >
      {children}
    </MatrizAuthLayout>
  )
}
