import type {
  ProjectBlueprintInput,
} from "../domain/project-blueprints"
import type { ProjectBlueprintRepository } from "../integration/filesystem/project-blueprint-repository"
import type { WorkspaceRepository } from "../integration/filesystem/workspace-repository"

export async function createProjectBlueprintWorkflow(
  workspace: WorkspaceRepository,
  blueprints: ProjectBlueprintRepository,
  input: ProjectBlueprintInput,
) {
  const draft = await blueprints.create(input)
  const backlog = await workspace.createBacklogItem(
    "matriz-infra-hub",
    {
      title: `Aplicar blueprint: ${draft.name}`,
      description: [
        `Blueprint ${draft.id}`,
        `Modo: ${draft.mode}`,
        `Tipo: ${draft.projectKind}`,
        `Destino: ${draft.target}`,
        "",
        "A criação do projeto depende de revisão da prévia e aprovação humana.",
      ].join("\n"),
      priority: "high",
      tags: ["blueprint", draft.projectKind.replace("_", "-")],
      acceptanceCriteria: [
        "A prévia foi revisada antes da escrita",
        "Os arquivos criados correspondem ao template selecionado",
        "Os comandos de validação foram executados",
      ],
    },
    "human",
  )
  const request = await workspace.createAgentRequest(
    "matriz-infra-hub",
    backlog.id,
    [
      `Leia o blueprint ${draft.id} em .matriz/blueprints/${draft.id}.json.`,
      "Revise target, boundaries e arquivos da prévia.",
      "Importante: não execute sem aprovação humana explícita.",
      "Não crie pastas adicionais e não mova domínio entre projetos.",
    ].join("\n"),
  )
  const blueprint = await blueprints.markRequested(draft.id, draft.revision, {
    backlogItemId: backlog.id,
    agentRequestId: request.id,
  })
  return { blueprint, backlog, request }
}
