import type {
  FinanceOverview,
  FinancialEntryCategory,
  FinancialEntryKind,
  FinancialEntryOrigin,
  FinancialEntryStatus,
} from "../finance"

export type FinancialEntryEventRecord = {
  readonly id: string
  readonly type: "CREATED" | "PAID" | "CANCELLED"
  readonly actorUserId: string
  readonly note: string | null
  readonly createdAt: string
}

export type FinancialEntryRecord = {
  readonly id: string
  readonly tenantId: string
  readonly entryNumber: number
  readonly kind: FinancialEntryKind
  readonly origin: FinancialEntryOrigin
  readonly status: FinancialEntryStatus
  readonly category: FinancialEntryCategory
  readonly title: string
  readonly description: string | null
  readonly amountCents: number
  readonly currency: string
  readonly competenceDate: string
  readonly dueDate: string
  readonly paidAt: string | null
  readonly orderId: string | null
  readonly version: number
  readonly createdByUserId: string
  readonly createdAt: string
  readonly updatedAt: string
  readonly events: readonly FinancialEntryEventRecord[]
}

export type FinanceOverviewResult = {
  readonly overview: FinanceOverview
  readonly entries: readonly FinancialEntryRecord[]
}

export type CreateManualFinancialEntryCommand = {
  readonly kind: FinancialEntryKind
  readonly category: Exclude<FinancialEntryCategory, "SALES">
  readonly title: string
  readonly description: string | null
  readonly amountCents: number
  readonly competenceDate: string
  readonly dueDate: string
  readonly paidAt: string | null
  readonly idempotencyKey: string
}

export type TransitionManualFinancialEntryCommand = {
  readonly expectedVersion: number
  readonly status: "PAID" | "CANCELLED"
  readonly occurredAt: string
  readonly actorUserId: string
  readonly note: string | null
}

export interface FinanceRepository {
  listOverview(tenantId: string, filters: { competenceMonth: string }, today: string): Promise<FinanceOverviewResult>
  findEntry(tenantId: string, entryId: string): Promise<FinancialEntryRecord | null>
  createManualEntry(tenantId: string, actorUserId: string, command: CreateManualFinancialEntryCommand): Promise<FinancialEntryRecord>
  transitionManualEntry(tenantId: string, entryId: string, command: TransitionManualFinancialEntryCommand): Promise<FinancialEntryRecord | null>
  reconcileOrderReceipt(tenantId: string, orderId: string): Promise<FinancialEntryRecord | null>
}
