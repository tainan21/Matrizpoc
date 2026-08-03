import type { ReactNode } from "react"
import { MatrizAuthLayout } from "@matriz/design-ui"

export function LoginLayoutFrame({ children }: { children: ReactNode }) {
  return (
    <MatrizAuthLayout
      appId="matriz-hub"
      product="Matriz"
      productLabel="Hub"
      mark="M"
      eyebrow="Um ecossistema, uma entrada"
      headline="Tudo começa pelo contexto certo."
      description="Acesse apps, eventos e decisões do ecossistema a partir de uma visão central."
      panelTitle="Entre no ecossistema."
      footer="Identidade compartilhada · sessão isolada por app"
    >
      {children}
    </MatrizAuthLayout>
  )
}
