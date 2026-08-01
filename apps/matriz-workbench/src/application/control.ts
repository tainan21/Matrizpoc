import { createHash, randomUUID } from "node:crypto"
import type { BacklogItem, Roadmap } from "../domain/schemas"
import type { BacklogInsight, EvidenceProposal, ScorePolicy, ScoreSummary } from "../domain/control"

export const DEFAULT_SCORE_POLICY: ScorePolicy = {
  schemaVersion: 1,
  projectId: "",
  weights: { app: 0.45, docs: 0.3, "features-domains": 0.25 },
  updatedAt: new Date(0).toISOString(),
  revision: "0000000000000000",
}

function revisionFor(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16)
}

export function buildScoreSummary(
  roadmap: Roadmap,
  policy: ScorePolicy,
  proposals: EvidenceProposal[],
): ScoreSummary {
  const tracks = (["app", "docs", "features-domains"] as const).map((slug) => {
    const scorecard = roadmap.scorecards.find((item) => item.slug === slug)
    const goals = scorecard?.goals ?? []
    const approvedIds = new Set(
      proposals.filter((item) => item.scorecardSlug === slug && item.status === "approved").map((item) => item.goalId),
    )
    const approved = goals.filter((goal) => goal.score === 1 && (approvedIds.has(goal.id) || goal.evidence.length > 0)).length
    const pending = goals.length ? goals.length - approved : 100
    return { slug, title: scorecard?.title ?? slug, score: approved, approved, pending, total: 100 as const }
  })
  const aggregate = Math.round(tracks.reduce((sum, track) => sum + track.score * (policy.weights[track.slug as keyof typeof policy.weights] ?? 0), 0))
  const base = { schemaVersion: 1 as const, projectId: roadmap.projectId, aggregate, tracks, updatedAt: new Date().toISOString() }
  return { ...base, revision: revisionFor(base) }
}

export function getBacklogInsights(items: BacklogItem[]): BacklogInsight[] {
  const insights: BacklogInsight[] = []
  for (const item of items) {
    const base = { id: `ins_${randomUUID()}`, projectId: item.projectId, backlogItemId: item.id, title: item.title, priority: item.priority, createdAt: new Date().toISOString() }
    if (item.status === "blocked") insights.push({ ...base, schemaVersion: 1, kind: "blocked", detail: "Tarefa bloqueada exige uma decisão ou dependência resolvida." })
    else if (!item.acceptanceCriteria.length) insights.push({ ...base, schemaVersion: 1, kind: "missing_context", detail: "Adicione critérios de aceite antes de enviar ao Codex." })
    else if (item.dependencyIds.length) insights.push({ ...base, schemaVersion: 1, kind: "dependency", detail: "A tarefa possui dependências que precisam ser acompanhadas." })
    if (insights.length >= 50) break
  }
  return insights
}
