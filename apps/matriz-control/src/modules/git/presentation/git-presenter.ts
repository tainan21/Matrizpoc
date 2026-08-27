import type { GitOverview } from "../integration/git-cli-repository"

export interface GitOverviewViewModel {
  readonly branch: string
  readonly status: "Limpo" | "Alterações" | "Divergente" | "Conflito"
  readonly attention: "none" | "medium" | "high" | "critical"
  readonly changeTotal: number
  readonly ahead: number
  readonly behind: number
  readonly head: string
  readonly subject: string
  readonly changes: GitOverview["changes"]
}

export function presentGitOverview(snapshot: GitOverview): GitOverviewViewModel {
  const changeTotal = snapshot.changes.length
  const status = snapshot.counts.conflicted ? "Conflito" : snapshot.ahead && snapshot.behind ? "Divergente" : changeTotal ? "Alterações" : "Limpo"
  const attention = status === "Conflito" ? "critical" : status === "Divergente" ? "high" : status === "Alterações" ? "medium" : "none"
  return { branch: snapshot.branch ?? "detached HEAD", status, attention, changeTotal, ahead: snapshot.ahead, behind: snapshot.behind, head: snapshot.head.shortId, subject: snapshot.head.subject, changes: snapshot.changes }
}
