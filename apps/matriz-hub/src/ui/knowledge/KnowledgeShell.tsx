"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import { HubIcon } from "../environment/icons"

const KNOWLEDGE_AREAS = [
  { href: "/docs", label: "Biblioteca", detail: "verdade canônica", icon: "docs" as const, exact: true },
  { href: "/docs/review-desk", label: "Mesa de revisão", detail: "decisões pendentes", icon: "review" as const },
  { href: "/docs/context", label: "Contextos", detail: "pacotes de leitura", icon: "context" as const },
  { href: "/docs/graph", label: "Relações", detail: "grafo institucional", icon: "graph" as const },
  { href: "/docs/timeline", label: "Histórico", detail: "trilha auditável", icon: "timeline" as const },
  { href: "/docs/mcp", label: "Acesso por agentes", detail: "MCP", icon: "agent" as const },
] as const

export function KnowledgeShell({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname()

  return (
    <section className="knowledge-environment" data-knowledge-zone>
      <header className="knowledge-environment__bar">
        <div className="knowledge-environment__identity">
          <span className="knowledge-environment__sigil"><HubIcon name="docs" size={20} /></span>
          <span><small>Área persistente</small><strong>Memória operacional</strong></span>
        </div>
        <nav aria-label="Áreas do MatrizDocs" className="knowledge-environment__areas">
          {KNOWLEDGE_AREAS.map((item) => {
            const active = "exact" in item && item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href)
            return (
              <Link aria-current={active ? "page" : undefined} href={item.href} key={item.href}>
                <HubIcon name={item.icon} size={16} />
                <span><strong>{item.label}</strong><small>{item.detail}</small></span>
              </Link>
            )
          })}
        </nav>
        <div className="knowledge-environment__principle">
          <span aria-hidden="true">◇</span>
          <span><small>Regra ativa</small><strong>Evidência antes de verdade</strong></span>
        </div>
      </header>
      <div className="knowledge-environment__workspace">{children}</div>
    </section>
  )
}
