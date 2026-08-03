import type { ReactNode } from "react"
import { MatrizAuthLayout } from "@matriz/design-ui"

export function LoginLayoutFrame({ children }: { children: ReactNode }) {
  return (
    <MatrizAuthLayout
      appId="willdash"
      product="WillDash"
      productLabel="Metas & sinais"
      mark="W"
      eyebrow="Metas em movimento"
      headline="Decida olhando para o que mudou."
      description="Transforme atividade e telemetria em uma leitura clara do progresso da sua operação."
      panelTitle="Entre no seu dashboard."
      footer="Magic link · telemetria local · base Matriz"
    >
      {children}
    </MatrizAuthLayout>
  )
}
