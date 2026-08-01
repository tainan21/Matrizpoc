import type { BacklogItem } from "../domain/schemas"

export interface BacklogIntelligence {
  readiness: number
  nextAction: string
  missingContext: string[]
  blockedBy: string[]
}

export function analyzeBacklogItem(
  item: BacklogItem,
  backlog: readonly BacklogItem[],
): BacklogIntelligence {
  const byId = new Map(backlog.map((candidate) => [candidate.id, candidate]))
  const blockedBy = item.dependencyIds.filter((dependencyId) => {
    const dependency = byId.get(dependencyId)
    return !dependency || dependency.status !== "done"
  })
  const missingContext = [
    item.description.trim().length < 80 ? "descrição objetiva" : "",
    item.acceptanceCriteria.length === 0 ? "critérios de aceite" : "",
    item.tags.length === 0 ? "tags" : "",
    item.references.length === 0 ? "referências" : "",
  ].filter(Boolean)
  const readiness = Math.min(
    100,
    (item.description.trim().length >= 80 ? 25 : 0) +
      (item.acceptanceCriteria.length ? 30 : 0) +
      (item.tags.length ? 15 : 0) +
      (item.references.length ? 10 : 0) +
      (blockedBy.length === 0 ? 20 : 0),
  )

  let nextAction = "Revisar escopo"
  if (item.status === "done") nextAction = "Manter evidências"
  else if (item.status === "archived") nextAction = "Nenhuma ação"
  else if (blockedBy.length) nextAction = `Resolver ${blockedBy.length} dependência(s)`
  else if (missingContext.includes("descrição objetiva")) nextAction = "Completar contexto"
  else if (missingContext.includes("critérios de aceite")) nextAction = "Definir critérios"
  else if (item.status === "idea") nextAction = "Preparar para execução"
  else if (item.status === "ready") nextAction = "Enviar ao Codex"
  else if (item.status === "in_progress") nextAction = "Registrar progresso"
  else if (item.status === "blocked") nextAction = "Explicar bloqueio"
  else if (item.status === "review") nextAction = "Revisar evidências"

  return { readiness, nextAction, missingContext, blockedBy }
}
