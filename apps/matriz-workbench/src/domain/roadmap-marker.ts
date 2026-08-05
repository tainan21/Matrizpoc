import type { ActivityEvent, RoadmapMarker, WorkItem } from "./schemas"

export class RoadmapMarkerPolicyError extends Error {}

export function markerHasReviewableEvidence(marker: RoadmapMarker, workItems: WorkItem[]): boolean {
  if (marker.references.length > 0) return true
  const linked = new Map(workItems.map((item) => [item.id, item]))
  return marker.backlogIds.some((id) => {
    const item = linked.get(id)
    return item?.productStatus === "completed" && item.references.length > 0
  })
}

export function assertRoadmapMarkerStatusChange(
  marker: RoadmapMarker,
  nextStatus: RoadmapMarker["status"],
  options: {
    actor: ActivityEvent["actor"]
    evidenceAvailable: boolean
    reviewedBy?: string
    waiverReason?: string
  },
): void {
  const isGate = marker.kind === "validation_gate" || marker.kind === "decision_gate"
  if (isGate && (nextStatus === "passed" || nextStatus === "failed" || nextStatus === "waived") && options.actor !== "human") {
    throw new RoadmapMarkerPolicyError("A revisão de um gate exige um participante humano.")
  }
  if (isGate && nextStatus === "passed") {
    if (!options.reviewedBy?.trim()) throw new RoadmapMarkerPolicyError("Informe quem realizou a revisão humana.")
    if (!options.evidenceAvailable) throw new RoadmapMarkerPolicyError("Vincule evidência revisável antes de aprovar o gate.")
  }
  if (isGate && nextStatus === "waived" && !options.waiverReason?.trim()) {
    throw new RoadmapMarkerPolicyError("A dispensa do gate exige justificativa.")
  }
  if (!isGate && nextStatus === "achieved" && !options.evidenceAvailable) {
    throw new RoadmapMarkerPolicyError("Vincule evidência revisável antes de atingir o marco ou release.")
  }
}
