import { randomUUID } from "node:crypto"
import type {
  RoadmapGoal,
  RoadmapGoalCategory,
  RoadmapScorecard,
  RoadmapScorecardScope,
} from "../domain/schemas"

interface ScorecardArea {
  name: string
  category: RoadmapGoalCategory
}

export interface ScorecardDefinition {
  slug: string
  title: string
  description: string
  scope: RoadmapScorecardScope
  areas: readonly ScorecardArea[]
  stages: readonly string[]
}

const APP_STAGES = [
  "Definir contrato e resultado de",
  "Mapear estado atual de",
  "Registrar decisões de",
  "Implementar baseline de",
  "Cobrir estados e exceções de",
  "Validar acessibilidade e segurança de",
  "Medir qualidade e performance de",
  "Documentar operação de",
  "Validar em uso real de",
  "Concluir auditoria de",
] as const

const DOC_STAGES = [
  "Inventariar conteúdo de",
  "Definir audiência e perguntas de",
  "Criar guia principal de",
  "Adicionar exemplos executáveis de",
  "Adicionar diagramas e referências de",
  "Documentar erros e recuperação de",
  "Revisar consistência e linguagem de",
  "Validar comandos e links de",
  "Testar onboarding usando",
  "Publicar e manter índice de",
] as const

const FEATURE_STAGES = [
  "Definir domínio e linguagem de",
  "Mapear casos de uso de",
  "Estabelecer contratos de",
  "Implementar leitura de",
  "Implementar mutações seguras de",
  "Integrar contexto Codex de",
  "Adicionar segurança e limites de",
  "Cobrir testes e observabilidade de",
  "Validar uso real de",
  "Documentar evolução e reuso de",
] as const

const INFRA_DOC_STAGES = [
  "Definir visão de",
  "Mapear arquitetura de",
  "Registrar decisões de",
  "Criar guia operacional de",
  "Adicionar diagramas e fluxos de",
  "Registrar comandos e exemplos de",
  "Explicar extensão e reuso de",
  "Cobrir segurança e limites de",
  "Validar onboarding de",
  "Publicar índice canônico de",
] as const

export const WORKBENCH_SCORECARD_DEFINITIONS: readonly ScorecardDefinition[] = [
  {
    slug: "app",
    title: "Workbench · App",
    description: "Produto, interface, design system local, experiência e qualidade operacional do aplicativo.",
    scope: "workbench_app",
    stages: APP_STAGES,
    areas: [
      { name: "visão e escopo do produto", category: "vision" },
      { name: "shell, navegação e responsividade", category: "experience" },
      { name: "temas light/dark e tokens", category: "design" },
      { name: "componentes e padrões de interação", category: "design" },
      { name: "descoberta e visão de projetos", category: "product" },
      { name: "roadmap e trilhas 0–100", category: "product" },
      { name: "backlog e fluxo de trabalho", category: "product" },
      { name: "documentos e decisões na interface", category: "experience" },
      { name: "performance, acessibilidade e segurança", category: "quality" },
      { name: "release, recuperação e operação local", category: "scale" },
    ],
  },
  {
    slug: "docs",
    title: "Workbench · Docs",
    description: "Documentação necessária para instalar, entender, operar, integrar e evoluir o Workbench.",
    scope: "workbench_docs",
    stages: DOC_STAGES,
    areas: [
      { name: "início rápido e instalação", category: "quality" },
      { name: "arquitetura e boundaries", category: "architecture" },
      { name: "protocolo de arquivos e schemas", category: "architecture" },
      { name: "scripts e comandos", category: "quality" },
      { name: "rotas e ações da interface", category: "product" },
      { name: "API local e streaming Codex", category: "collaboration" },
      { name: "MCP, resources e tools", category: "collaboration" },
      { name: "score, roadmap e backlog", category: "product" },
      { name: "segurança, recuperação e troubleshooting", category: "security" },
      { name: "onboarding humano–Codex", category: "collaboration" },
    ],
  },
  {
    slug: "features-domains",
    title: "Workbench · Features & domains",
    description: "Blocos avançados e reutilizáveis, mantidos no app até provarem estabilidade e dois consumidores reais.",
    scope: "workbench_features",
    stages: FEATURE_STAGES,
    areas: [
      { name: "inteligência de projetos", category: "product" },
      { name: "inteligência de backlog", category: "product" },
      { name: "context bundles e orçamento de tokens", category: "performance" },
      { name: "execuções, threads e aprovações Codex", category: "collaboration" },
      { name: "evidências, diffs e verificações", category: "quality" },
      { name: "documentação e conhecimento conectado", category: "collaboration" },
      { name: "adapters GitHub, Vercel e notificações", category: "scale" },
      { name: "automação local segura", category: "security" },
      { name: "portabilidade file-backed e cloud adapter", category: "architecture" },
      { name: "templates, plugins e extensibilidade", category: "scale" },
    ],
  },
] as const

export const INFRA_DOCS_SCORECARD_DEFINITION: ScorecardDefinition = {
  slug: "docs",
  title: "Matriz Infra Hub · Docs",
  description: "Conhecimento canônico para instalar, compreender, operar e ampliar o ecossistema Matriz.",
  scope: "ecosystem_docs",
  stages: INFRA_DOC_STAGES,
  areas: [
    { name: "visão, princípios e linguagem do ecossistema", category: "vision" },
    { name: "monorepo, multirrepositório e ownership", category: "architecture" },
    { name: "domains, DDD, SOLID e boundaries", category: "architecture" },
    { name: "packages, reuso e critérios de extração", category: "scale" },
    { name: "Next.js, React, React Native, PWA e evolução Tauri", category: "product" },
    { name: "design system, temas e experiência multiplataforma", category: "design" },
    { name: "dados, multi-tenant, autenticação e segurança", category: "security" },
    { name: "APIs, eventos, MCP e coworking com Codex", category: "collaboration" },
    { name: "instalação, scripts, CI/CD e observabilidade", category: "quality" },
    { name: "criação, migração e integração de novos projetos", category: "scale" },
  ],
}

function createGoals(definition: ScorecardDefinition): RoadmapGoal[] {
  const goals = definition.areas.flatMap((area) =>
    definition.stages.map((stage) => ({
      id: `goal_${randomUUID()}`,
      ordinal: 0,
      title: `${stage} ${area.name}`,
      outcome: "",
      category: area.category,
      score: 0 as const,
      evidence: [],
    })),
  ).map((goal, index) => ({ ...goal, ordinal: index + 1 }))

  if (goals.length !== 100) throw new Error(`A trilha ${definition.slug} precisa conter 100 metas.`)
  return goals
}

export function createScorecard(definition: ScorecardDefinition): RoadmapScorecard {
  return {
    id: `scorecard_${randomUUID()}`,
    slug: definition.slug,
    title: definition.title,
    description: definition.description,
    scope: definition.scope,
    goals: createGoals(definition),
  }
}

export function definitionsForProject(projectId: string): readonly ScorecardDefinition[] {
  if (projectId === "matriz-workbench") return WORKBENCH_SCORECARD_DEFINITIONS
  if (projectId === "matriz-infra-hub") return [INFRA_DOCS_SCORECARD_DEFINITION]
  return []
}
