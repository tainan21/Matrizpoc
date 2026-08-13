import type { HubCommandItem, HubNavGroup, HubNavItem } from "./types"

export const HUB_NAV_GROUPS: readonly HubNavGroup[] = [
  {
    id: "operations-center",
    label: "Centro operacional",
    items: [
      {
        label: "Visão Geral",
        href: "/",
        description: "Situação, atenção e atividade do ecossistema",
        icon: "overview",
        keywords: ["início", "home", "panorama"],
      },
      {
        label: "Projetos",
        href: "/projects",
        description: "Portfólio institucional e contexto dos projetos",
        icon: "project",
        keywords: ["apps", "portfólio"],
      },
      {
        label: "Saúde",
        href: "/health",
        description: "Readiness, checks e sinais que precisam de atenção",
        icon: "health",
        keywords: ["status", "readiness", "checks"],
      },
      {
        label: "Intelligence",
        href: "/intelligence",
        description: "Leituras institucionais publicadas pelos projetos",
        icon: "telemetry",
        keywords: ["métricas", "indicadores"],
      },
    ],
  },
  {
    id: "structure",
    label: "Estrutura",
    items: [
      {
        label: "Registry",
        href: "/registry",
        description: "Apps registrados e seus contratos públicos",
        icon: "registry",
        keywords: ["manifest", "contrato", "capability"],
      },
      {
        label: "Catálogo",
        href: "/catalog",
        description: "Rotas, capacidades e eventos de cada app",
        icon: "layers",
        keywords: ["apps", "rotas", "eventos"],
      },
      {
        label: "Ecossistema",
        href: "/ecosystem",
        description: "Produtores, consumidores e superfícies compartilhadas",
        icon: "ecosystem",
        keywords: ["integração", "fluxo", "dependência"],
      },
      {
        label: "Links externos",
        href: "/external-links",
        description: "Relações entre entidades de apps distintos",
        icon: "link",
        keywords: ["vínculo", "cross-app"],
      },
    ],
  },
  {
    id: "operation",
    label: "Operação",
    items: [
      {
        label: "Eventos",
        href: "/events",
        description: "Histórico do EventBus da sessão atual",
        icon: "event",
        keywords: ["timeline", "bus", "atividade"],
      },
      {
        label: "Telemetria",
        href: "/telemetry",
        description: "Envelopes emitidos nesta instância do Hub",
        icon: "telemetry",
        keywords: ["métrica", "sinal", "observabilidade"],
      },
      {
        label: "Onboarding",
        href: "/onboarding-status",
        description: "Progresso local por tenant e aplicação",
        icon: "onboarding",
        keywords: ["ativação", "tenant", "progresso"],
      },
      {
        label: "Feature flags",
        href: "/feature-flags",
        description: "Configuração demonstrativa de capacidades por tenant",
        icon: "flag",
        keywords: ["flags", "configuração"],
      },
    ],
  },
  {
    id: "knowledge",
    label: "Conhecimento",
    items: [
      {
        label: "MatrizDocs",
        href: "/docs",
        description: "Biblioteca viva, documentos e contexto institucional",
        icon: "docs",
        keywords: ["documentos", "biblioteca", "babylon"],
      },
      {
        label: "Mesa de revisão",
        href: "/docs/review-desk",
        description: "Sugestões e contextos que pedem decisão",
        icon: "review",
        keywords: ["aprovação", "sugestão"],
      },
      {
        label: "Contextos",
        href: "/docs/context",
        description: "Pacotes de contexto versionados",
        icon: "context",
        keywords: ["package", "mcp"],
      },
      {
        label: "Grafo",
        href: "/docs/graph",
        description: "Relações entre entidades e conhecimento",
        icon: "graph",
        keywords: ["entidades", "relações"],
      },
      {
        label: "Timeline documental",
        href: "/docs/timeline",
        description: "Histórico institucional auditável",
        icon: "timeline",
        keywords: ["histórico", "eventos"],
      },
    ],
  },
  {
    id: "tools",
    label: "Ferramentas",
    items: [
      {
        label: "Praticies",
        href: "/praticies",
        description: "Bancada de automações locais controladas",
        icon: "tool",
        keywords: ["patterns", "automação", "utilitários"],
      },
    ],
  },
  {
    id: "system",
    label: "Sistema",
    items: [
      {
        label: "Auditoria",
        href: "/audit",
        description: "Diagnóstico e evolução técnica do ecossistema",
        icon: "audit",
        keywords: ["arquitetura", "segurança", "roadmap"],
      },
    ],
  },
] as const

export function resolveActiveNavItem(pathname: string): HubNavItem | undefined {
  const items = HUB_NAV_GROUPS.flatMap((group) => group.items)

  return items
    .filter((item) =>
      item.href === "/"
        ? pathname === "/"
        : pathname === item.href || pathname.startsWith(`${item.href}/`),
    )
    .sort((left, right) => right.href.length - left.href.length)[0]
}

export function buildCommandItems(
  groups: readonly HubNavGroup[],
): readonly HubCommandItem[] {
  return groups.flatMap((group) =>
    group.items.map((item) => ({
      ...item,
      groupLabel: group.label,
      searchableText: [
        item.label,
        item.description,
        group.label,
        ...(item.keywords ?? []),
      ]
        .join(" ")
        .toLocaleLowerCase("pt-BR"),
    })),
  )
}

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim()
}

export function filterCommandItems(
  items: readonly HubCommandItem[],
  query: string,
): readonly HubCommandItem[] {
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean)
  if (terms.length === 0) return items

  return items.filter((item) => {
    const searchableText = normalizeSearch(item.searchableText)
    return terms.every((term) => searchableText.includes(term))
  })
}
