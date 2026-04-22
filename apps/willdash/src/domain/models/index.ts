import type { Brand, TenantId, ISODateString, AppIdLiteral } from "@matriz/foundation-types"

// ---- Dashboards (visoes agregadas) ----
export type DashboardId = Brand<string, "DashboardId">
export type WidgetId = Brand<string, "WidgetId">

export type WidgetKind = "counter" | "timeline" | "breakdown"

export interface DashboardWidget {
  readonly id: WidgetId
  readonly title: string
  readonly kind: WidgetKind
  readonly sourceApp: AppIdLiteral
  readonly metric: string
}

export interface Dashboard {
  readonly id: DashboardId
  readonly tenantId: TenantId
  readonly name: string
  readonly description: string
  readonly widgets: DashboardWidget[]
  readonly createdAt: ISODateString
}

export interface AggregatedTelemetry {
  readonly appId: AppIdLiteral
  readonly totalEvents: number
  readonly byName: Record<string, number>
  readonly lastEventAt?: ISODateString
}

// ---- Goals (dominio proprio do Willdash) ----
export type GoalId = Brand<string, "GoalId">
export type ActivityId = Brand<string, "ActivityId">
export type RewardRuleId = Brand<string, "RewardRuleId">

export type GoalStatus = "active" | "completed" | "archived"

export interface Goal {
  readonly id: GoalId
  readonly tenantId: TenantId
  readonly title: string
  readonly description: string
  readonly targetValue: number
  readonly currentValue: number
  readonly unit: string
  readonly status: GoalStatus
  readonly dueAt?: ISODateString
  readonly createdAt: ISODateString
}

export type ActivityKind = "session" | "milestone" | "check-in"

export interface ActivityRecord {
  readonly id: ActivityId
  readonly tenantId: TenantId
  readonly goalId?: GoalId
  readonly kind: ActivityKind
  readonly note: string
  readonly value: number
  readonly createdAt: ISODateString
}

export interface RewardRule {
  readonly id: RewardRuleId
  readonly tenantId: TenantId
  readonly title: string
  readonly trigger: string
  readonly rewardLabel: string
  readonly active: boolean
}
