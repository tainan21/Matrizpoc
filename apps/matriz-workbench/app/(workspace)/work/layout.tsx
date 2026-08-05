import Link from "next/link"
import type { ReactNode } from "react"

export default function WorkLayout({ children }: { children: ReactNode }) {
  return (
    <main className="workspace-page adaptive-work-route">
      <nav className="work-tabs" aria-label="Trabalho">
        <Link href="/work/inbox">Inbox</Link>
        <Link href="/work/backlog">Backlog</Link>
        <Link href="/work/sprints">Sprints</Link>
      </nav>
      {children}
    </main>
  )
}
