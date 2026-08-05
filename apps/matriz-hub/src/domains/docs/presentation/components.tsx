import Link from "next/link"
import type { ReactNode } from "react"
import {
  Alert,
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Heading,
  Stack,
  Text,
} from "@matriz/design-ui"
import type {
  ContextPackageDTO,
  DocumentBlockDTO,
  DocumentSummaryDTO,
  KnowledgeEdgeDTO,
  KnowledgeNodeDTO,
  SuggestionDTO,
  TimelineEventDTO,
} from "@matriz/integration-api-contracts/v1/docs"
import {
  docsHumanEventName,
  docsToneForSensitivity,
  docsToneForStatus,
} from "./presenters"

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
    <div className="flex flex-col gap-4 md:flex md:flex-row md:items-start md:justify-between">
      <div>
        <div className="mb-2 flex flex-wrap gap-2">
          <Badge tone="brand">MatrizDocs V1</Badge>
          <Badge tone="neutral">memoria viva</Badge>
        </div>
        <Heading level={1}>{title}</Heading>
        <Text tone="muted" className="max-w-lg">
          {description}
        </Text>
      </div>
      {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
    </div>
  )
}

export function DocsNav() {
  const items = [
    ["/docs", "Biblioteca"],
    ["/docs/import", "Importar"],
    ["/docs/suggestions", "Sugestoes"],
    ["/docs/context", "Contextos"],
    ["/docs/entities", "Entidades"],
    ["/docs/timeline", "Timeline"],
    ["/docs/review-desk", "Review Desk"],
    ["/docs/mcp", "MCP"],
  ] as const

  return (
    <div className="flex flex-wrap gap-2">
      {items.map(([href, label]) => (
        <Link key={href} href={href} className="no-underline">
          <Badge tone="neutral">{label}</Badge>
        </Link>
      ))}
    </div>
  )
}

export function DocsUnavailable({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : String(error)
  return (
    <Stack gap={4}>
      <DocsNav />
      <Alert tone="warning" title="MatrizDocs precisa do Hub DB">
        {`A UI e as APIs estao implementadas, mas esta tela nao conseguiu consultar o Postgres do Hub. Detalhe: ${message}`}
      </Alert>
      <Card>
        <CardHeader>
          <CardTitle>Checklist de ambiente</CardTitle>
          <CardDescription>Para rodar a V1 com dados persistidos.</CardDescription>
        </CardHeader>
        <ul className="list-disc pl-5 text-sm text-surface-fg">
          <li>Defina `HUB_DATABASE_URL` apontando para o schema `hub`.</li>
          <li>Rode `pnpm prisma:generate:hub` apos aplicar o schema.</li>
          <li>Aplique a migration Prisma antes de usar as rotas mutantes.</li>
        </ul>
      </Card>
    </Stack>
  )
}

export function StatsGrid({
  stats,
}: {
  stats: Record<string, number | string>
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Object.entries(stats).map(([label, value]) => (
        <Card key={label}>
          <div className="text-xs text-muted-fg">{label}</div>
          <div className="text-3xl font-semibold text-surface-fg">{value}</div>
        </Card>
      ))}
    </div>
  )
}

export function DocumentGrid({ documents }: { documents: DocumentSummaryDTO[] }) {
  if (documents.length === 0) {
    return (
      <EmptyState
        title="Nenhum documento ainda"
        description="Crie ou importe o primeiro documento para iniciar a memoria viva da Matriz."
        action={
          <Link href="/docs/new" className="no-underline">
            <Button>Criar documento</Button>
          </Link>
        }
      />
    )
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {documents.map((doc) => (
        <Link key={doc.id} href={`/docs/${doc.id}`} className="no-underline">
          <Card>
            <CardHeader>
              <CardTitle>{doc.title}</CardTitle>
              <CardDescription>{doc.summary ?? doc.description ?? "Documento canonico MatrizDocs."}</CardDescription>
            </CardHeader>
            <Stack gap={3}>
              <div className="flex flex-wrap gap-2">
                <Badge tone={docsToneForStatus(doc.status)}>{doc.status}</Badge>
                <Badge tone="neutral">{doc.type}</Badge>
                <Badge tone="neutral">{doc.visibility}</Badge>
                <Badge tone={docsToneForSensitivity(doc.sensitivity)}>{doc.sensitivity}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs text-muted-fg">
                <div>
                  <div className="text-lg font-semibold text-surface-fg">{doc.counters?.blocks ?? 0}</div>
                  blocos
                </div>
                <div>
                  <div className="text-lg font-semibold text-surface-fg">{doc.counters?.contextPackages ?? 0}</div>
                  contextos
                </div>
                <div>
                  <div className="text-lg font-semibold text-surface-fg">v{doc.currentVersionNumber ?? 1}</div>
                  versao
                </div>
              </div>
            </Stack>
          </Card>
        </Link>
      ))}
    </div>
  )
}

export function BlockList({ blocks }: { blocks: DocumentBlockDTO[] }) {
  if (blocks.length === 0) return <EmptyState title="Sem blocos canonicos" />
  return (
    <Stack gap={3}>
      {blocks.map((block) => (
        <Card key={block.id}>
          <div className="flex flex-wrap gap-2">
            <Badge tone="brand">{block.type}</Badge>
            <Badge tone={docsToneForSensitivity(block.sensitivity)}>{block.sensitivity}</Badge>
            <Badge tone="neutral">#{block.order + 1}</Badge>
          </div>
          <Text className="mt-3">{block.plainText || "Bloco vazio"}</Text>
        </Card>
      ))}
    </Stack>
  )
}

export function SuggestionList({ suggestions }: { suggestions: SuggestionDTO[] }) {
  if (suggestions.length === 0) return <EmptyState title="Nenhuma sugestao pendente" />
  return (
    <Stack gap={3}>
      {suggestions.map((suggestion) => (
        <Card key={suggestion.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge tone={docsToneForStatus(suggestion.status)}>{suggestion.status}</Badge>
                <Badge tone="neutral">{suggestion.type}</Badge>
                {suggestion.confidence !== null ? (
                  <Badge tone="brand">{`${Math.round(suggestion.confidence * 100)}%`}</Badge>
                ) : null}
              </div>
              <Heading level={4} className="mt-2">{suggestion.title}</Heading>
              <Text tone="muted" size="sm">{suggestion.description}</Text>
              <pre className="mt-3 overflow-x-auto rounded-md bg-muted p-3 text-xs">
                {JSON.stringify(suggestion.evidence, null, 2)}
              </pre>
            </div>
            {suggestion.status === "suggested" ? (
              <div className="flex flex-wrap gap-2">
                <form action={`/api/docs/suggestions/${suggestion.id}/accept`} method="post">
                  <Button type="submit" size="sm">Aceitar</Button>
                </form>
                <form action={`/api/docs/suggestions/${suggestion.id}/reject`} method="post">
                  <Button type="submit" size="sm" variant="secondary">Rejeitar</Button>
                </form>
              </div>
            ) : null}
          </div>
        </Card>
      ))}
    </Stack>
  )
}

export function TimelineList({ timeline }: { timeline: TimelineEventDTO[] }) {
  if (timeline.length === 0) return <EmptyState title="Timeline vazia" />
  return (
    <Stack gap={3}>
      {timeline.map((event) => (
        <Card key={event.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Badge tone="neutral">{event.targetType}</Badge>
              <Heading level={4} className="mt-2">{docsHumanEventName(event.name)}</Heading>
              <Text tone="muted" size="sm">
                {`${new Date(event.occurredAt).toLocaleString("pt-BR")} por ${event.actorType}:${event.actorId}`}
              </Text>
            </div>
            <code className="text-xs text-muted-fg">{event.name}</code>
          </div>
          <pre className="mt-3 overflow-x-auto rounded-md bg-muted p-3 text-xs">
            {JSON.stringify(event.payload, null, 2)}
          </pre>
        </Card>
      ))}
    </Stack>
  )
}

export function ContextGrid({ contexts }: { contexts: ContextPackageDTO[] }) {
  if (contexts.length === 0) return <EmptyState title="Nenhum context package ainda" />
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {contexts.map((context) => (
        <Link key={context.id} href={`/docs/context/${context.id}`} className="no-underline">
          <Card>
            <CardHeader>
              <CardTitle>{context.title}</CardTitle>
              <CardDescription>{context.summary ?? context.description ?? "Pacote de leitura versionado."}</CardDescription>
            </CardHeader>
            <div className="flex flex-wrap gap-2">
              <Badge tone={docsToneForStatus(context.status)}>{context.status}</Badge>
              <Badge tone="neutral">{context.audience}</Badge>
              <Badge tone="brand">v{context.version}</Badge>
              {context.mcpUri ? <Badge tone="neutral">{context.mcpUri}</Badge> : null}
            </div>
          </Card>
        </Link>
      ))}
    </div>
  )
}

export function EntityGrid({ entities }: { entities: KnowledgeNodeDTO[] }) {
  if (entities.length === 0) return <EmptyState title="Nenhuma entidade ainda" />
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {entities.map((entity) => (
        <Link key={entity.id} href={`/docs/entities/${entity.id}`} className="no-underline">
          <Card>
            <CardHeader>
              <CardTitle>{entity.name}</CardTitle>
              <CardDescription>{entity.description ?? "Entidade da memoria institucional."}</CardDescription>
            </CardHeader>
            <div className="flex flex-wrap gap-2">
              <Badge tone="brand">{entity.type}</Badge>
              <Badge tone="neutral">{entity.slug}</Badge>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  )
}

export function RelationList({ relations }: { relations: KnowledgeEdgeDTO[] }) {
  if (relations.length === 0) return <EmptyState title="Nenhuma relacao ainda" />
  return (
    <Stack gap={3}>
      {relations.map((edge) => (
        <Card key={edge.id}>
          <div className="flex flex-wrap gap-2">
            <Badge tone={docsToneForStatus(edge.status)}>{edge.status}</Badge>
            <Badge tone="brand">{edge.relationType}</Badge>
            {edge.confidence !== null ? <Badge tone="neutral">{`${Math.round(edge.confidence * 100)}%`}</Badge> : null}
          </div>
          <Text className="mt-2" size="sm">
            {`${edge.sourceNodeId} -> ${edge.targetNodeId}`}
          </Text>
        </Card>
      ))}
    </Stack>
  )
}
