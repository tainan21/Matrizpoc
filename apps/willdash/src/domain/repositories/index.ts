import type { TenantId } from "@matriz/foundation-types"
import type {
  Goal,
  GoalId,
  ActivityRecord,
  ActivityId,
  RewardRule,
} from "../models"

export interface GoalRepository {
  list(tenantId: TenantId): Promise<readonly Goal[]>
  getById(tenantId: TenantId, id: GoalId): Promise<Goal | null>
  create(goal: Goal): Promise<Goal>
  update(goal: Goal): Promise<Goal>
}

export interface ActivityRepository {
  list(tenantId: TenantId): Promise<readonly ActivityRecord[]>
  listByGoal(tenantId: TenantId, goalId: GoalId): Promise<readonly ActivityRecord[]>
  getById(tenantId: TenantId, id: ActivityId): Promise<ActivityRecord | null>
  create(activity: ActivityRecord): Promise<ActivityRecord>
}

export interface RewardRuleRepository {
  list(tenantId: TenantId): Promise<readonly RewardRule[]>
}
