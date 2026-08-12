import type { ReactNode } from "react"
import { getDocsPageActorContext } from "../../src/domains/docs/application/page-context"

export default async function DocsLayout({ children }: { children: ReactNode }) {
  await getDocsPageActorContext()
  return children
}
