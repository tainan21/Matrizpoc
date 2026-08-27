import type { ReactNode } from "react"
import { KnowledgeShell } from "../../src/ui/knowledge/KnowledgeShell"
import { getDocsPageActorContext } from "../../src/domains/docs/application/page-context"

export default async function DocsLayout({ children }: { readonly children: ReactNode }) {
  await getDocsPageActorContext()
  return <KnowledgeShell>{children}</KnowledgeShell>
}
