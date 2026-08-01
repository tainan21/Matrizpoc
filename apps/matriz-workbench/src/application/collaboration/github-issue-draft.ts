import type { BacklogItem } from "../../domain/schemas"
import type { DiscoveredProject } from "../../integration/filesystem/workspace-repository"
import type { DeliveryDraft } from "./delivery-provider"

function referenceLabel(reference: BacklogItem["references"][number]): string {
  if (reference.kind === "repository_file") return reference.path
  if (reference.kind === "external_url") return reference.url
  return `workbench-document:${reference.documentId}`
}

export function buildGitHubIssueDraft(
  project: DiscoveredProject,
  task: BacklogItem,
): DeliveryDraft {
  const criteria = task.acceptanceCriteria.length
    ? task.acceptanceCriteria
        .map((criterion) => `- [${criterion.completed ? "x" : " "}] ${criterion.text}`)
        .join("\n")
    : "- [ ] Definir critérios de aceite antes de iniciar."
  const dependencies = task.dependencyIds.length
    ? task.dependencyIds.map((id) => `- ${id}`).join("\n")
    : "- Nenhuma."
  const references = task.references.length
    ? task.references.map((reference) => `- ${referenceLabel(reference)}`).join("\n")
    : "- Nenhuma."

  return {
    provider: "github",
    kind: "issue",
    title: `[${project.displayName}] ${task.title}`,
    body: [
      task.description || "Sem descrição adicional.",
      "",
      "## Critérios de aceite",
      criteria,
      "",
      "## Dependências",
      dependencies,
      "",
      "## Referências",
      references,
      "",
      "## Origem",
      `- Projeto: \`${project.relativePath}\``,
      `- Workbench: \`${task.id}\``,
      `- Estado: \`${task.status}\``,
      `- Prioridade: \`${task.priority}\``,
      "",
      `<!-- matriz-workbench task=${task.id} revision=${task.revision} -->`,
    ].join("\n"),
    labels: Array.from(
      new Set([
        "matriz-workbench",
        project.id,
        `priority:${task.priority}`,
        ...task.tags.map((tag) => tag.toLowerCase()),
      ]),
    ).slice(0, 20),
    idempotencyKey: `${project.id}:${task.id}:${task.revision}`,
  }
}

export function buildGitHubPluginHandoff(draft: DeliveryDraft): string {
  return [
    "$github Crie uma issue no repositório associado ao working tree atual.",
    "Antes de escrever, procure uma issue aberta que contenha a mesma chave de idempotência.",
    "Se já existir, retorne o link e não duplique.",
    "Se não existir, use exatamente o título, corpo e labels abaixo.",
    "Peça aprovação antes da criação e devolva o URL final.",
    "",
    `Chave de idempotência: ${draft.idempotencyKey}`,
    `Título: ${draft.title}`,
    `Labels: ${draft.labels.join(", ")}`,
    "",
    draft.body,
  ].join("\n")
}
