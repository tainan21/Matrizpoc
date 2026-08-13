import Link from "next/link"
import type { ReactNode } from "react"
import type {
  ContextPackageDTO,
  DocumentBlockDTO,
  DocumentSummaryDTO,
  KnowledgeEdgeDTO,
  KnowledgeNodeDTO,
  SuggestionDTO,
  TimelineEventDTO,
} from "@matriz/integration-api-contracts/v1/docs"
import { HubIcon } from "../../../ui/environment/icons"
import { StatusLabel } from "../../../ui/environment/status"
import {
  docsHumanEventName,
  docsHumanStatus,
  docsStatusToHubStatus,
} from "./presenters"

const TOOL_LINKS = [
  ["/docs/new", "Criar", "Novo documento"],
  ["/docs/import", "Trazer conteúdo", "Import"],
  ["/docs/converter", "Estruturar", "Converter"],
  ["/docs/suggestions", "Sugestões", "Inbox"],
  ["/docs/entities", "Entidades", "Catálogo"],
  ["/docs/exports", "Distribuir", "Exports"],
  ["/docs/tasks", "Gerar trabalho", "Tasks"],
  ["/docs/governance", "Governança", "Candidates"],
  ["/docs/runs", "Execuções", "Runs"],
  ["/docs/settings", "Configurar", "Settings"],
] as const

export function DocsHeader({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <header className="knowledge-heading">
      <div className="knowledge-heading__copy">
        <span className="knowledge-eyebrow">CONHECIMENTO / MATRIZDOCS</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action ? <div className="knowledge-heading__actions">{action}</div> : null}
      <div className="knowledge-heading__seal" aria-label="Memória viva, versão 1">
        <HubIcon name="layers" size={28} />
        <span><strong>Memória viva</strong><small>canônico · versionado · auditável</small></span>
      </div>
    </header>
  )
}

export function DocsNav() {
  return (
    <details className="knowledge-toolbelt">
      <summary><HubIcon name="tool" size={16} /> Ações e ferramentas <small>mostrar opções contextuais</small></summary>
      <nav aria-label="Ferramentas do MatrizDocs">
        {TOOL_LINKS.map(([href, label, technical]) => (
          <Link href={href} key={href}>
            <strong>{label}</strong><small>{technical}</small>
          </Link>
        ))}
      </nav>
    </details>
  )
}

export function DocsUnavailable({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : String(error)
  return (
    <section className="knowledge-unavailable" role="status">
      <div className="knowledge-unavailable__icon"><HubIcon name="database" size={28} /></div>
      <div>
        <span className="knowledge-eyebrow">PERSISTÊNCIA / INDISPONÍVEL</span>
        <h1>A memória persistida não respondeu</h1>
        <p>A interface continua disponível, mas nenhum dado foi inventado. Conecte o Postgres do Hub para consultar e alterar documentos reais.</p>
        <details><summary>Diagnóstico técnico</summary><code>{message}</code></details>
      </div>
      <ol>
        <li><strong>Conectar</strong><span>Defina HUB_DATABASE_URL para o schema hub.</span></li>
        <li><strong>Preparar</strong><span>Gere o Prisma Client do Hub.</span></li>
        <li><strong>Persistir</strong><span>Aplique a migration antes de usar ações mutantes.</span></li>
      </ol>
    </section>
  )
}

export function StatsGrid({ stats }: { stats: Record<string, number | string> }) {
  return (
    <dl className="knowledge-metrics">
      {Object.entries(stats).map(([label, value], index) => (
        <div key={label} data-emphasis={index === 0 || undefined}>
          <dt>{label}</dt><dd>{value}</dd><small>{index === 0 ? "acervo atual" : "estado persistido"}</small>
        </div>
      ))}
    </dl>
  )
}

function EmptyKnowledge({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="knowledge-empty">
      <HubIcon name="layers" size={28} />
      <strong>{title}</strong>
      <span>{detail}</span>
    </div>
  )
}

export function DocumentGrid({ documents }: { documents: DocumentSummaryDTO[] }) {
  if (documents.length === 0) {
    return <EmptyKnowledge title="Nenhum documento ainda" detail="Crie ou importe a primeira fonte para iniciar a memória viva." />
  }
  return (
    <div className="knowledge-document-list">
      {documents.map((doc) => {
        const humanStatus = docsHumanStatus(doc.status)
        return (
          <Link href={`/docs/${doc.id}`} key={doc.id} className="knowledge-document">
            <span className="knowledge-document__icon"><HubIcon name="docs" size={20} /></span>
            <span className="knowledge-document__copy">
              <small>{doc.type} · {doc.visibility}</small>
              <strong>{doc.title}</strong>
              <span>{doc.summary ?? doc.description ?? "Documento canônico MatrizDocs."}</span>
            </span>
            <span className="knowledge-document__state">
              <StatusLabel status={docsStatusToHubStatus(doc.status)}>{humanStatus.label}</StatusLabel>
              <small>{humanStatus.technical}</small>
            </span>
            <span className="knowledge-document__facts">
              <span><strong>{doc.counters?.blocks ?? 0}</strong> blocos</span>
              <span><strong>{doc.counters?.contextPackages ?? 0}</strong> contextos</span>
              <span><strong>v{doc.currentVersionNumber ?? 1}</strong> versão</span>
            </span>
            <span className="knowledge-document__open" aria-hidden="true">›</span>
          </Link>
        )
      })}
    </div>
  )
}

export function BlockList({ blocks }: { blocks: DocumentBlockDTO[] }) {
  if (blocks.length === 0) return <EmptyKnowledge title="Sem blocos canônicos" detail="Estruture o conteúdo para criar unidades consultáveis." />
  return (
    <ol className="knowledge-blocks">
      {blocks.map((block) => (
        <li key={block.id}>
          <span className="knowledge-blocks__order">{String(block.order + 1).padStart(2, "0")}</span>
          <div><small>{block.type} · {block.sensitivity}</small><p>{block.plainText || "Bloco vazio"}</p></div>
        </li>
      ))}
    </ol>
  )
}

export function SuggestionList({ suggestions }: { suggestions: SuggestionDTO[] }) {
  if (suggestions.length === 0) return <EmptyKnowledge title="Nenhuma sugestão pendente" detail="A verdade canônica não exige uma decisão agora." />
  return (
    <div className="knowledge-decision-list">
      {suggestions.map((suggestion) => (
        <article key={suggestion.id}>
          <div className="knowledge-decision-list__state">
            <StatusLabel status={docsStatusToHubStatus(suggestion.status)}>{docsHumanStatus(suggestion.status).label}</StatusLabel>
            <code>{suggestion.type}</code>
          </div>
          <div className="knowledge-decision-list__copy">
            <strong>{suggestion.title}</strong><p>{suggestion.description}</p>
            <details><summary>Ver evidência {suggestion.confidence !== null ? `· ${Math.round(suggestion.confidence * 100)}% de confiança` : ""}</summary><pre>{JSON.stringify(suggestion.evidence, null, 2)}</pre></details>
          </div>
          {suggestion.status === "suggested" ? (
            <div className="knowledge-decision-list__actions">
              <form action={`/api/docs/suggestions/${suggestion.id}/accept`} method="post"><button className="knowledge-action" type="submit">Aceitar evidência <small>Accept</small></button></form>
              <form action={`/api/docs/suggestions/${suggestion.id}/reject`} method="post"><button className="knowledge-action" data-variant="secondary" type="submit">Rejeitar <small>Reject</small></button></form>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  )
}

export function TimelineList({ timeline }: { timeline: TimelineEventDTO[] }) {
  if (timeline.length === 0) return <EmptyKnowledge title="Histórico vazio" detail="Mudanças auditáveis aparecerão aqui quando acontecerem." />
  return (
    <ol className="knowledge-timeline">
      {timeline.map((event) => (
        <li key={event.id}>
          <span className="knowledge-timeline__mark" aria-hidden="true" />
          <time>{new Date(event.occurredAt).toLocaleString("pt-BR")}</time>
          <div><strong>{docsHumanEventName(event.name)}</strong><span>{event.actorType}:{event.actorId} · {event.targetType}</span></div>
          <code>{event.name}</code>
          <details><summary>payload</summary><pre>{JSON.stringify(event.payload, null, 2)}</pre></details>
        </li>
      ))}
    </ol>
  )
}

export function ContextGrid({ contexts }: { contexts: ContextPackageDTO[] }) {
  if (contexts.length === 0) return <EmptyKnowledge title="Nenhum pacote de contexto" detail="Agrupe documentos para uma leitura orientada por público e propósito." />
  return (
    <div className="knowledge-contexts">
      {contexts.map((context) => (
        <Link href={`/docs/context/${context.id}`} key={context.id}>
          <span className="knowledge-contexts__icon"><HubIcon name="context" size={20} /></span>
          <small>{context.audience} · v{context.version}</small>
          <strong>{context.title}</strong>
          <p>{context.summary ?? context.description ?? "Pacote de leitura versionado."}</p>
          <StatusLabel status={docsStatusToHubStatus(context.status)}>{docsHumanStatus(context.status).label}</StatusLabel>
          {context.mcpUri ? <code>{context.mcpUri}</code> : null}
        </Link>
      ))}
    </div>
  )
}

export function EntityGrid({ entities }: { entities: KnowledgeNodeDTO[] }) {
  if (entities.length === 0) return <EmptyKnowledge title="Nenhuma entidade" detail="Entidades surgem da indexação de documentos reais." />
  return (
    <div className="knowledge-entities">
      {entities.map((entity) => (
        <Link href={`/docs/entities/${entity.id}`} key={entity.id}>
          <HubIcon name="graph" size={18} />
          <span><small>{entity.type}</small><strong>{entity.name}</strong><p>{entity.description ?? "Entidade da memória institucional."}</p><code>{entity.slug}</code></span>
        </Link>
      ))}
    </div>
  )
}

export function RelationList({ relations }: { relations: KnowledgeEdgeDTO[] }) {
  if (relations.length === 0) return <EmptyKnowledge title="Nenhuma relação" detail="Conexões exigem origem, destino e evidência." />
  return (
    <div className="knowledge-relations">
      {relations.map((edge) => (
        <article key={edge.id}>
          <span className="knowledge-relations__node">{edge.sourceNodeId}</span>
          <span className="knowledge-relations__edge"><small>{edge.relationType}</small><i aria-hidden="true" /></span>
          <span className="knowledge-relations__node">{edge.targetNodeId}</span>
          <StatusLabel status={docsStatusToHubStatus(edge.status)}>{docsHumanStatus(edge.status).label}</StatusLabel>
          {edge.confidence !== null ? <small>{Math.round(edge.confidence * 100)}% confiança</small> : null}
        </article>
      ))}
    </div>
  )
}
