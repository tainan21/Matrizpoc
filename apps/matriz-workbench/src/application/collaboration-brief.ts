import type { Roadmap } from "../domain/schemas"
import type { DiscoveredProject } from "../integration/filesystem/workspace-repository"
import { AGENT_HANDBOOK_PATH } from "./agent-operating-summary"

export function buildCollaborationPrompt(
  project: DiscoveredProject,
  roadmap: Roadmap,
): string {
  const completed = roadmap.goals.filter((goal) => goal.score === 1).length
  const nextGoals = roadmap.goals
    .filter((goal) => goal.score === 0)
    .sort((a, b) => a.ordinal - b.ordinal)
    .slice(0, 8)

  return `# Próxima rodada — ${project.displayName}

Trabalhe comigo neste mesmo repositório como parceiro de produto e engenharia.

## Estado
- Projeto: ${project.relativePath}
- Package: ${project.packageName}
- Score verificável: ${completed}/100
- Stack detectada: ${project.technologies.join(", ") || "não identificada pelo package.json"}
- Pastas principais: ${project.topLevelFolders.join(", ") || "nenhuma"}

## Metas desta rodada
${nextGoals.map((goal) => `- ${goal.ordinal}. ${goal.title}`).join("\n") || "- Definir as primeiras metas do roadmap 0–100."}

## Forma de trabalho
1. Leia AGENTS.md, ${AGENT_HANDBOOK_PATH} e a documentação do projeto antes de opinar.
2. Atue sequencialmente pelas lentes de Product Engineer, Software Architect, UX Engineer e Security Engineer; entregue uma única síntese, sem simular uma equipe de agentes.
3. Trabalhe no menor escopo possível e preserve boundaries entre apps.
4. Mantenha domínio de produto dentro do app. Só proponha package compartilhado com dois consumidores reais, superfície estável e ganho de manutenção comprovado.
5. Antes de implementar, explique a decisão, o risco e o critério de conclusão.
6. Implemente uma fatia pequena, valide e registre evidências no Workbench.
7. Não marque ponto como concluído sem resultado observável.
8. Uma mudança pode ser registrada no backlog/activity sem alterar o score.

## Design
- Feche tokens, tipografia, espaçamento, estados e variantes antes de multiplicar componentes.
- Use uma cor de ação, contraste AA, navegação por teclado e reduced motion.
- Inclua feedback de ação, loading, erro, vazio e sucesso.
- Animações devem melhorar hierarquia: entrada curta, progresso e toast; nunca ornamentação contínua.

## Encerramento
- Liste arquivos alterados e comandos executados.
- Atualize backlog, activity e score 0–100.
- Deixe explícito o próximo ponto ainda em zero.
`
}
