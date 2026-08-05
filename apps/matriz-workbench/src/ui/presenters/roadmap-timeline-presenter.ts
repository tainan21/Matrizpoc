import type {
  ActivityEvent,
  Roadmap,
  RoadmapInitiative,
  RoadmapMarker,
  RoadmapStatus,
  WorkItem,
} from "../../domain/schemas"

export const ROADMAP_STATUS_LABELS: Record<RoadmapStatus, string> = {
  planned: "Planejado",
  active: "Em andamento",
  paused: "Pausado",
  completed: "Concluído",
}

export const ROADMAP_MARKER_KIND_LABELS: Record<RoadmapMarker["kind"], string> = {
  milestone: "Marco", validation_gate: "Gate de validação", decision_gate: "Gate de decisão", release: "Release",
}

export interface RoadmapQuarterViewModel {
  id: string
  label: string
  range: string
  isCurrent: boolean
}

export interface RoadmapLinkedItemViewModel {
  id: string
  title: string
  kind: WorkItem["kind"]
  productStatus: WorkItem["productStatus"]
  completed: boolean
  evidenceCount: number
}

export interface RoadmapInitiativeViewModel {
  id: string
  phaseId: string
  phaseTitle: string
  title: string
  outcome: string
  status: RoadmapStatus
  statusLabel: string
  domain: string
  responsible: string
  startDate?: string
  targetDate?: string
  timeRangeLabel: string
  left?: number
  width?: number
  linkedItems: RoadmapLinkedItemViewModel[]
  missingBacklogIds: string[]
  completion: number | null
  evidenceCount: number
}

export interface RoadmapPhaseViewModel {
  id: string
  title: string
  outcome: string
  status: RoadmapStatus
  statusLabel: string
  progress: number
  initiatives: RoadmapInitiativeViewModel[]
  scheduled: RoadmapInitiativeViewModel[]
  unscheduled: RoadmapInitiativeViewModel[]
  markers: RoadmapMarkerViewModel[]
}

export interface RoadmapMarkerViewModel {
  id: string
  phaseId: string
  initiativeId?: string
  initiativeTitle?: string
  kind: RoadmapMarker["kind"]
  kindLabel: string
  title: string
  description: string
  status: RoadmapMarker["status"]
  statusLabel: string
  targetDate: string
  targetDateLabel: string
  responsible: string
  left: number
  linkedItems: RoadmapLinkedItemViewModel[]
  missingBacklogIds: string[]
  references: RoadmapMarker["references"]
  evidenceCount: number
  reviewedBy?: string
  reviewedAt?: string
  reviewNote?: string
  waiverReason?: string
}

export interface RoadmapTimelineViewModel {
  revision: string
  totalInitiatives: number
  scheduledCount: number
  totalMarkers: number
  domains: string[]
  quarters: RoadmapQuarterViewModel[]
  phases: RoadmapPhaseViewModel[]
  rangeStart: string
  rangeEnd: string
  todayPosition?: number
}

export interface RoadmapInspectorViewModel extends RoadmapInitiativeViewModel {
  roadmapRevision: string
  history: Array<{
    id: string
    actor: string
    action: string
    summary: string
    occurredAt: string
  }>
}

export interface RoadmapMarkerInspectorViewModel extends RoadmapMarkerViewModel {
  roadmapRevision: string
  phaseTitle: string
  history: RoadmapInspectorViewModel["history"]
}

function parseDate(value: string): number {
  return Date.parse(`${value}T00:00:00.000Z`)
}

function calendarDate(value: Date): string {
  return value.toISOString().slice(0, 10)
}

function quarterStart(value: string): Date {
  const date = new Date(parseDate(value))
  return new Date(Date.UTC(date.getUTCFullYear(), Math.floor(date.getUTCMonth() / 3) * 3, 1))
}

function addMonths(value: Date, months: number): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + months, 1))
}

function formatDate(value?: string): string {
  if (!value) return ""
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" })
    .format(new Date(parseDate(value)))
    .replace(".", "")
}

function toLinkedItem(item: WorkItem): RoadmapLinkedItemViewModel {
  return {
    id: item.id,
    title: item.title,
    kind: item.kind,
    productStatus: item.productStatus,
    completed: item.productStatus === "completed",
    evidenceCount: item.references.length,
  }
}

function initiativeDates(initiative: RoadmapInitiative): [string | undefined, string | undefined] {
  if (!initiative.startDate && !initiative.targetDate) return [undefined, undefined]
  return [initiative.startDate ?? initiative.targetDate, initiative.targetDate ?? initiative.startDate]
}

export function toRoadmapTimelineViewModel(
  roadmap: Roadmap,
  workItems: WorkItem[],
  today = new Date().toISOString().slice(0, 10),
): RoadmapTimelineViewModel {
  const initiatives = roadmap.phases.flatMap((phase) => phase.initiatives)
  const dates = [...initiatives.flatMap((initiative) => [initiative.startDate, initiative.targetDate]), ...roadmap.markers.map((marker) => marker.targetDate)].filter(Boolean) as string[]
  const firstDate = dates.length ? dates.reduce((first, value) => value < first ? value : first) : today
  const lastDate = dates.length ? dates.reduce((last, value) => value > last ? value : last) : today
  const rangeStartDate = quarterStart(firstDate)
  const lastQuarterStart = quarterStart(lastDate)
  const minimumEnd = addMonths(rangeStartDate, 12)
  const dataEnd = addMonths(lastQuarterStart, 3)
  const rangeEndDate = dataEnd > minimumEnd ? dataEnd : minimumEnd
  const rangeStart = calendarDate(rangeStartDate)
  const rangeEnd = calendarDate(new Date(rangeEndDate.getTime() - 86_400_000))
  const startTime = rangeStartDate.getTime()
  const endTime = rangeEndDate.getTime()
  const span = Math.max(endTime - startTime, 1)
  const itemById = new Map(workItems.map((item) => [item.id, item]))
  const quarters: RoadmapQuarterViewModel[] = []

  for (let cursor = rangeStartDate; cursor < rangeEndDate; cursor = addMonths(cursor, 3)) {
    const quarter = Math.floor(cursor.getUTCMonth() / 3) + 1
    const quarterEnd = new Date(addMonths(cursor, 3).getTime() - 86_400_000)
    quarters.push({
      id: `${cursor.getUTCFullYear()}-q${quarter}`,
      label: `Q${quarter} ${cursor.getUTCFullYear()}`,
      range: `${new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" }).format(cursor).replace(".", "")} – ${new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" }).format(quarterEnd).replace(".", "")}`,
      isCurrent: parseDate(today) >= cursor.getTime() && parseDate(today) <= quarterEnd.getTime(),
    })
  }

  const phases = roadmap.phases.map((phase) => {
    const mapped = phase.initiatives.map((initiative): RoadmapInitiativeViewModel => {
      const [startDate, targetDate] = initiativeDates(initiative)
      const linkedItems = initiative.backlogIds.map((id) => itemById.get(id)).filter(Boolean).map((item) => toLinkedItem(item!))
      const missingBacklogIds = initiative.backlogIds.filter((id) => !itemById.has(id))
      const rawLeft = startDate ? ((parseDate(startDate) - startTime) / span) * 100 : undefined
      const rawRight = targetDate ? ((parseDate(targetDate) + 86_400_000 - startTime) / span) * 100 : undefined
      const left = rawLeft === undefined ? undefined : Math.max(0, Math.min(rawLeft, 98))
      const width = left === undefined || rawRight === undefined
        ? undefined
        : Math.max(2.5, Math.min(rawRight, 100) - left)
      return {
        id: initiative.id,
        phaseId: phase.id,
        phaseTitle: phase.title,
        title: initiative.title,
        outcome: initiative.outcome,
        status: initiative.status,
        statusLabel: ROADMAP_STATUS_LABELS[initiative.status],
        domain: initiative.domain ?? phase.title,
        responsible: initiative.responsible ?? "Não atribuído",
        startDate,
        targetDate,
        timeRangeLabel: startDate && targetDate ? `${formatDate(startDate)} – ${formatDate(targetDate)}` : "Sem período",
        left,
        width,
        linkedItems,
        missingBacklogIds,
        completion: linkedItems.length
          ? Math.round((linkedItems.filter((item) => item.completed).length / linkedItems.length) * 100)
          : null,
        evidenceCount: linkedItems.reduce((total, item) => total + item.evidenceCount, 0),
      }
    })
    const completed = mapped.filter((initiative) => initiative.status === "completed").length
    const markers = roadmap.markers.filter((marker) => marker.phaseId === phase.id).map((marker): RoadmapMarkerViewModel => {
      const linkedItems = marker.backlogIds.map((id) => itemById.get(id)).filter(Boolean).map((item) => toLinkedItem(item!))
      const isGate = marker.kind === "validation_gate" || marker.kind === "decision_gate"
      const statusLabels: Record<string, string> = { planned: "Planejado", pending_review: "Aguardando revisão", passed: "Aprovado", failed: "Reprovado", waived: "Dispensado", achieved: "Atingido", missed: "Não atingido", cancelled: "Cancelado" }
      return {
        id: marker.id, phaseId: marker.phaseId, initiativeId: marker.initiativeId,
        initiativeTitle: phase.initiatives.find((initiative) => initiative.id === marker.initiativeId)?.title,
        kind: marker.kind, kindLabel: ROADMAP_MARKER_KIND_LABELS[marker.kind], title: marker.title, description: marker.description,
        status: marker.status, statusLabel: statusLabels[marker.status] ?? marker.status, targetDate: marker.targetDate,
        targetDateLabel: formatDate(marker.targetDate), responsible: marker.responsible ?? "Não atribuído",
        left: Math.max(0, Math.min(((parseDate(marker.targetDate) - startTime) / span) * 100, 100)), linkedItems,
        missingBacklogIds: marker.backlogIds.filter((id) => !itemById.has(id)), references: marker.references,
        evidenceCount: marker.references.length + linkedItems.reduce((total, item) => total + (item.completed ? item.evidenceCount : 0), 0),
        reviewedBy: isGate ? marker.reviewedBy : undefined, reviewedAt: isGate ? marker.reviewedAt : undefined,
        reviewNote: isGate ? marker.reviewNote : undefined, waiverReason: isGate ? marker.waiverReason : undefined,
      }
    })
    return {
      id: phase.id,
      title: phase.title,
      outcome: phase.outcome,
      status: phase.status,
      statusLabel: ROADMAP_STATUS_LABELS[phase.status],
      progress: mapped.length ? Math.round((completed / mapped.length) * 100) : 0,
      initiatives: mapped,
      scheduled: mapped.filter((initiative) => initiative.startDate && initiative.targetDate),
      unscheduled: mapped.filter((initiative) => !initiative.startDate || !initiative.targetDate),
      markers,
    }
  })
  const todayTime = parseDate(today)

  return {
    revision: roadmap.revision,
    totalInitiatives: initiatives.length,
    scheduledCount: initiatives.filter((initiative) => initiative.startDate || initiative.targetDate).length,
    totalMarkers: roadmap.markers.length,
    domains: Array.from(new Set(phases.flatMap((phase) => phase.initiatives.map((initiative) => initiative.domain)))).sort((a, b) => a.localeCompare(b, "pt-BR")),
    quarters,
    phases,
    rangeStart,
    rangeEnd,
    todayPosition: todayTime >= startTime && todayTime < endTime ? ((todayTime - startTime) / span) * 100 : undefined,
  }
}

export function toRoadmapMarkerInspectorViewModel(
  timeline: RoadmapTimelineViewModel,
  markerId: string,
  history: ActivityEvent[],
): RoadmapMarkerInspectorViewModel | undefined {
  const phase = timeline.phases.find((item) => item.markers.some((marker) => marker.id === markerId))
  const marker = phase?.markers.find((item) => item.id === markerId)
  if (!phase || !marker) return undefined
  return {
    ...marker,
    phaseTitle: phase.title,
    roadmapRevision: timeline.revision,
    history: history.map((event) => ({ id: event.id, actor: event.actor, action: event.action, summary: event.summary, occurredAt: event.occurredAt })),
  }
}

export function toRoadmapInspectorViewModel(
  timeline: RoadmapTimelineViewModel,
  initiativeId: string,
  history: ActivityEvent[],
): RoadmapInspectorViewModel | undefined {
  const initiative = timeline.phases.flatMap((phase) => phase.initiatives).find((item) => item.id === initiativeId)
  if (!initiative) return undefined
  return {
    ...initiative,
    roadmapRevision: timeline.revision,
    history: history.map((event) => ({
      id: event.id,
      actor: event.actor,
      action: event.action,
      summary: event.summary,
      occurredAt: event.occurredAt,
    })),
  }
}
