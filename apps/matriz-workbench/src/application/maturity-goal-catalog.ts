import { randomUUID } from "node:crypto"
import type { RoadmapGoal, RoadmapGoalCategory } from "../domain/schemas"

const GROUPS: ReadonlyArray<{
  category: RoadmapGoalCategory
  titles: readonly string[]
}> = [
  {
    category: "vision",
    titles: [
      "Definir a dor central e a intenção",
      "Materializar a base operacional",
      "Adotar o score 0–100 como linguagem comum",
      "Definir público e decisões prioritárias",
      "Registrar princípios de produto",
      "Delimitar o que não será construído",
      "Definir outcomes mensuráveis",
      "Mapear riscos de produto",
      "Validar o fluxo principal com uso real",
      "Revisar visão e escopo",
    ],
  },
  {
    category: "product",
    titles: [
      "Fechar modelo de projetos",
      "Fechar modelo de roadmap",
      "Fechar modelo de backlog",
      "Fechar modelo de documentação",
      "Fechar modelo de decisões",
      "Fechar modelo de solicitações ao Codex",
      "Definir estados vazios e recuperação",
      "Definir busca e filtros",
      "Definir referências entre artefatos",
      "Validar rotina semanal de uso",
    ],
  },
  {
    category: "architecture",
    titles: [
      "Documentar boundaries do Workbench",
      "Manter domínio específico dentro do app",
      "Definir critérios para extração em packages",
      "Mapear packages existentes e responsabilidades",
      "Eliminar imports cruzados entre apps",
      "Estabilizar contratos públicos",
      "Fechar protocolo file-backed",
      "Definir adapter futuro de persistência",
      "Validar conflitos e escrita atômica",
      "Executar revisão arquitetural",
    ],
  },
  {
    category: "design",
    titles: [
      "Fechar tese visual do Workbench",
      "Consolidar tokens semânticos",
      "Fechar escala tipográfica",
      "Fechar escala de espaçamento",
      "Fechar cores e contraste",
      "Definir componentes operacionais",
      "Definir estados e variantes",
      "Definir iconografia",
      "Documentar critérios de compartilhamento no design package",
      "Auditar consistência visual",
    ],
  },
  {
    category: "experience",
    titles: [
      "Fechar navegação por teclado",
      "Adicionar feedback de ações",
      "Adicionar toast acessível",
      "Adicionar estados de carregamento",
      "Adicionar transições de progresso",
      "Adicionar estados de erro acionáveis",
      "Revisar experiência mobile",
      "Revisar densidade e legibilidade",
      "Validar acessibilidade AA",
      "Executar teste de uso completo",
    ],
  },
  {
    category: "quality",
    titles: [
      "Cobrir schemas com testes",
      "Cobrir repository com testes",
      "Cobrir MCP com testes de contrato",
      "Automatizar E2E crítico",
      "Definir gates por app",
      "Definir clean clone test",
      "Documentar setup Windows",
      "Padronizar logs e erros",
      "Medir cobertura de fluxos críticos",
      "Fechar checklist de release",
    ],
  },
  {
    category: "security",
    titles: [
      "Validar traversal e caminhos absolutos",
      "Validar proteção contra symlinks",
      "Validar limites de arquivos",
      "Validar token e cookie local",
      "Mapear ameaças do MCP",
      "Exigir aprovação em mutações",
      "Redigir política de secrets",
      "Redigir política de dados sensíveis",
      "Adicionar auditoria de dependências",
      "Executar revisão de segurança",
    ],
  },
  {
    category: "performance",
    titles: [
      "Medir tempo de discovery",
      "Evitar leituras repetidas",
      "Limitar contexto do Codex",
      "Medir bundle do cliente",
      "Reduzir client components",
      "Validar listas com muitos itens",
      "Definir estratégia de cache local",
      "Adicionar métricas operacionais",
      "Definir orçamento de performance",
      "Executar baseline de performance",
    ],
  },
  {
    category: "collaboration",
    titles: [
      "Fechar protocolo humano–Codex",
      "Definir prompt de início de rodada",
      "Definir prompt de conclusão",
      "Definir quando continuar ou abrir novo chat",
      "Definir personas especializadas do ChatGPT",
      "Definir plugins opcionais por contexto",
      "Associar tarefas a conversas",
      "Exibir diffs e verificações",
      "Integrar streaming e aprovações",
      "Validar uma semana de coworking real",
    ],
  },
  {
    category: "scale",
    titles: [
      "Validar descoberta de dezenas de apps",
      "Mapear stacks por projeto",
      "Mapear domínios compartilháveis",
      "Mapear integrações entre projetos",
      "Definir estratégia de templates",
      "Definir feature flags",
      "Preparar adapter cloud opcional",
      "Preparar colaboração remota",
      "Preparar integração GitHub",
      "Concluir auditoria 100/100",
    ],
  },
]

export function createMaturityGoalCatalog(): RoadmapGoal[] {
  return GROUPS.flatMap((group) =>
    group.titles.map((title) => ({
      id: `goal_${randomUUID()}`,
      ordinal: 0,
      title,
      outcome: "",
      category: group.category,
      score: 0 as const,
      evidence: [],
    })),
  ).map((goal, index) => ({ ...goal, ordinal: index + 1 }))
}
