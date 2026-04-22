import { generateId } from "@matriz/foundation-utils"
import { asISODate } from "@matriz/foundation-types"
import type { TenantId } from "@matriz/foundation-types"
import type {
  GoalRepository,
  ActivityRepository,
  RewardRuleRepository,
} from "../domain/repositories"
import type {
  ActivityRecord,
  ActivityId,
  ActivityKind,
  Goal,
  GoalId,
  GoalStatus,
} from "../domain/models"

export interface WilldashUseCases {
  listGoals(tenantId: TenantId): Promise<readonly Goal[]>
  getGoal(tenantId: TenantId, id: GoalId): Promise<Goal | null>
  openGoal(
    tenantId: TenantId,
    id: GoalId,
  ): Promise<{ goal: Goal; activities: readonly ActivityRecord[] } | null>
  logActivity(input: {
    tenantId: TenantId
    goalId?: GoalId
    kind: ActivityKind
    note: string
    value: number
  }): Promise<ActivityRecord>
  listActivities(tenantId: TenantId): Promise<readonly ActivityRecord[]>
  listRewardRules(tenantId: TenantId): ReturnType<RewardRuleRepository["list"]>
}

export function createUseCases(deps: {
  goals: GoalRepository
  activities: ActivityRepository
  rewardRules: RewardRuleRepository
}): WilldashUseCases {
  return {
    async listGoals(tenantId) {
      return deps.goals.list(tenantId)
    },
    async getGoal(tenantId, id) {
      return deps.goals.getById(tenantId, id)
    },
    async openGoal(tenantId, id) {
      const goal = await deps.goals.getById(tenantId, id)
      if (!goal) return null
      const activities = await deps.activities.listByGoal(tenantId, id)
      return { goal, activities }
    },
    async logActivity(input) {
      const activity: ActivityRecord = {
        id: generateId("act") as ActivityId,
        tenantId: input.tenantId,
        goalId: input.goalId,
        kind: input.kind,
        note: input.note,
        value: input.value,
        createdAt: asISODate(new Date().toISOString()),
      }
      const created = await deps.activities.create(activity)
      // atualiza progresso se houver goalId
      if (input.goalId && input.value > 0) {
        const goal = await deps.goals.getById(input.tenantId, input.goalId)
        if (goal) {
          const newValue = Math.min(goal.currentValue + input.value, goal.targetValue)
          const newStatus: GoalStatus =
            newValue >= goal.targetValue ? "completed" : goal.status
          await deps.goals.update({ ...goal, currentValue: newValue, status: newStatus })
        }
      }
      return created
    },
    async listActivities(tenantId) {
      return deps.activities.list(tenantId)
    },
    async listRewardRules(tenantId) {
      return deps.rewardRules.list(tenantId)
    },
  }
}
