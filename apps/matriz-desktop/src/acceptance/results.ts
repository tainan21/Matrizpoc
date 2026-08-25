import { ACCEPTANCE_CASES, type AcceptanceTarget } from "./catalog"

export type AcceptanceStatus = "pass" | "fail" | "blocked" | "not-applicable"
export type AcceptanceVerdict = "ready" | "not-ready" | "blocked"

export interface AcceptanceResult {
  readonly schemaVersion: "v1"
  readonly runId: string
  readonly id: string
  readonly target: AcceptanceTarget
  readonly status: AcceptanceStatus
  readonly startedAt: string
  readonly durationMs: number
  readonly commit?: string
  readonly artifactSha256?: string
  readonly summary: string
  readonly evidence: readonly string[]
}

export interface AcceptanceUnresolved {
  readonly id: string
  readonly status: Exclude<AcceptanceStatus, "pass">
}

export interface AcceptanceSummary {
  readonly verdict: AcceptanceVerdict
  readonly packagedRunCount: number
  readonly unresolved: readonly AcceptanceUnresolved[]
}

function unresolvedStatus(statuses: readonly (AcceptanceStatus | undefined)[]) {
  if (statuses.includes("blocked")) return "blocked" as const
  if (statuses.some((status) => status !== "pass")) {
    return statuses.includes("not-applicable") ? ("not-applicable" as const) : ("fail" as const)
  }
  return undefined
}

export function summarizeAcceptance(results: readonly AcceptanceResult[]): AcceptanceSummary {
  const packaged = results.filter((result) => result.target === "packaged-candidate")
  const runIds = [...new Set(packaged.map((result) => result.runId))]
  const unresolved = ACCEPTANCE_CASES.flatMap<AcceptanceUnresolved>((acceptanceCase) => {
    const statuses = runIds.map(
      (runId) =>
        packaged.find((result) => result.runId === runId && result.id === acceptanceCase.id)?.status,
    )
    const status = unresolvedStatus(statuses)
    return status ? [{ id: acceptanceCase.id, status }] : []
  })

  const verdict: AcceptanceVerdict = unresolved.some((item) => item.status === "blocked")
    ? "blocked"
    : runIds.length < 2 || unresolved.length > 0
      ? "not-ready"
      : "ready"

  return Object.freeze({
    verdict,
    packagedRunCount: runIds.length,
    unresolved: Object.freeze(unresolved.map((item) => Object.freeze(item))),
  })
}
