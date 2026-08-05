import { definitionsForProject, createScorecard } from "../application/scorecard-catalog"
import { WorkspaceRepository } from "../integration/filesystem/workspace-repository"

const ROOT_DOC_EVIDENCE = new Map<number, string[]>([
  [1, ["docs/MATRIZ-TECHNICAL-GUIDE.md"]],
  [4, ["docs/MATRIZ-TECHNICAL-GUIDE.md"]],
  [10, ["docs/README.md"]],
  [94, ["docs/NEW-PROJECT-GUIDE.md", "docs/COWORKING-API-MCP.md"]],
])

const ROOT_BACKLOG = [
  {
    title: "Validar o guia técnico com um clone limpo",
    description: "Executar o onboarding descrito em docs/MATRIZ-TECHNICAL-GUIDE.md a partir de um clone limpo e registrar toda divergência entre documentação e comportamento real.",
    priority: "high" as const,
    tags: ["docs", "onboarding", "validation"],
    acceptanceCriteria: [
      "Instalação reproduzida com Node 22 e pnpm 9",
      "Todos os comandos inválidos ou ausentes foram corrigidos na documentação",
      "Resultado registrado como evidência na trilha documental",
    ],
  },
  {
    title: "Definir estratégia PWA por tipo de app",
    description: "Registrar critérios objetivos para decidir quando um app Matriz deve oferecer instalação PWA, offline, atualização controlada e notificações.",
    priority: "medium" as const,
    tags: ["docs", "pwa", "architecture"],
    acceptanceCriteria: [
      "Casos favoráveis e desfavoráveis documentados",
      "Estratégia de cache e atualização descrita",
      "Responsabilidades de segurança e observabilidade registradas",
    ],
  },
  {
    title: "Definir fronteira compartilhável com React Native",
    description: "Mapear quais contratos, tokens e regras podem ser compartilhados com futuros apps React Native sem reutilizar componentes DOM ou acoplar os runtimes.",
    priority: "medium" as const,
    tags: ["docs", "react-native", "packages"],
    acceptanceCriteria: [
      "Superfícies portáveis e não portáveis listadas",
      "Critérios de package compartilhado aplicados",
      "Primeiro experimento recomendado e limitado",
    ],
  },
  {
    title: "Promover uma API pública versionada do Workbench",
    description: "Definir consumidores, autenticação, DTOs e versionamento antes de expor backlog ou roadmap por HTTP fora da interface local.",
    priority: "low" as const,
    tags: ["api", "contracts", "workbench"],
    acceptanceCriteria: [
      "Consumidor externo real identificado",
      "DTO v1 documentado",
      "Ameaças e autorização revisadas",
    ],
  },
  {
    title: "Integrar o próximo repositório externo ao inventário",
    description: "Usar o modelo de integração para conectar o próximo projeto externo por contrato, sem imports por caminho e sem copiar seu domínio para o Infra Hub.",
    priority: "high" as const,
    tags: ["onboarding", "multi-repo", "integration"],
    acceptanceCriteria: [
      "Ownership e bounded context registrados",
      "Fronteira de integração escolhida",
      "Projeto aparece no fluxo operacional do Workbench",
    ],
  },
]

async function ensureScorecards(repository: WorkspaceRepository, projectId: string) {
  const roadmap = await repository.getRoadmap(projectId)
  const existing = new Set(roadmap.scorecards.map((scorecard) => scorecard.slug))
  const additions = definitionsForProject(projectId)
    .filter((definition) => !existing.has(definition.slug))
    .map(createScorecard)
  if (!additions.length) return roadmap
  return repository.updateRoadmapScorecards(
    projectId,
    [...roadmap.scorecards, ...additions],
    roadmap.revision,
    "system",
  )
}

async function main() {
  const repository = await WorkspaceRepository.create()
  await repository.initializeProject("matriz-infra-hub")
  await ensureScorecards(repository, "matriz-workbench")
  let rootRoadmap = await ensureScorecards(repository, "matriz-infra-hub")
  const rootDocs = rootRoadmap.scorecards.find((scorecard) => scorecard.slug === "docs")
  if (!rootDocs) throw new Error("Trilha documental do Infra Hub não encontrada.")
  const scoredRootDocs = {
    ...rootDocs,
    goals: rootDocs.goals.map((goal) => {
      const evidence = ROOT_DOC_EVIDENCE.get(goal.ordinal)
      return evidence
        ? { ...goal, score: 1 as const, evidence, outcome: "Documento canônico criado e versionado." }
        : goal
    }),
  }
  rootRoadmap = await repository.updateRoadmapScorecards(
    "matriz-infra-hub",
    rootRoadmap.scorecards.map((scorecard) =>
      scorecard.id === scoredRootDocs.id ? scoredRootDocs : scorecard,
    ),
    rootRoadmap.revision,
    "system",
  )

  const backlog = await repository.listBacklog("matriz-infra-hub")
  const existingTitles = new Set(backlog.map((item) => item.title))
  for (const item of ROOT_BACKLOG) {
    if (!existingTitles.has(item.title)) {
      await repository.createBacklogItem("matriz-infra-hub", item, "system")
    }
  }

  const workbenchRoadmap = await repository.getRoadmap("matriz-workbench")
  console.log(JSON.stringify({
    projects: (await repository.discoverProjects()).map((project) => project.id),
    workbench: Object.fromEntries(
      workbenchRoadmap.scorecards.map((scorecard) => [
        scorecard.slug,
        scorecard.goals.filter((goal) => goal.score === 1).length,
      ]),
    ),
    infraHubDocs: rootRoadmap.scorecards
      .find((scorecard) => scorecard.slug === "docs")
      ?.goals.filter((goal) => goal.score === 1).length,
    infraHubBacklog: (await repository.listBacklog("matriz-infra-hub")).length,
  }, null, 2))
}

void main()
