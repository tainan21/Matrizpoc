import type {
  ActivityEvent,
  Roadmap,
  RoadmapInitiative,
  RoadmapStatus,
  WorkItem,
} from "../../domain/schemas"

export const ROADMAP_STATUS_LABELS: Record<RoadmapStatus, string> = {
  planned: "Planejado",
  active: "Em andamento",
  paused: "Pausado",
  completed: "Concluído",
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
}

export interface RoadmapTimelineViewModel {
  revision: string
  totalInitiatives: number
  scheduledCount: number
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
  const dates = initiatives.flatMap((initiative) => [initiative.startDate, initiative.targetDate]).filter(Boolean) as string[]
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
    }
  })
  const todayTime = parseDate(today)

  return {
    revision: roadmap.revision,
    totalInitiatives: initiatives.length,
    scheduledCount: initiatives.filter((initiative) => initiative.startDate || initiative.targetDate).length,
    domains: Array.from(new Set(phases.flatMap((phase) => phase.initiatives.map((initiative) => initiative.domain)))).sort((a, b) => a.localeCompare(b, "pt-BR")),
    quarters,
    phases,
    rangeStart,
    rangeEnd,
    todayPosition: todayTime >= startTime && todayTime < endTime ? ((todayTime - startTime) / span) * 100 : undefined,
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
