import type { ReactNode } from "react"
import { KnowledgeShell } from "../../src/ui/knowledge/KnowledgeShell"

export default function DocsLayout({ children }: { readonly children: ReactNode }) {
  return <KnowledgeShell>{children}</KnowledgeShell>
}
