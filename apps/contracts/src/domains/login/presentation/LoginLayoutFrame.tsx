import type { ReactNode } from "react"
import { MatrizAuthLayout } from "@matriz/design-ui"

export function LoginLayoutFrame({ children }: { children: ReactNode }) {
  return (
    <MatrizAuthLayout
      appId="contracts"
      product="Contracts"
      productLabel="Documentos & acordos"
      mark="C"
      eyebrow="Acordos com clareza"
      headline="Cada compromisso começa com contexto."
      description="Crie, acompanhe e conecte contratos às operações que deram origem a cada acordo."
      panelTitle="Acesse seus contratos."
      footer="Magic link · trilha documental · base Matriz"
    >
      {children}
    </MatrizAuthLayout>
  )
}
