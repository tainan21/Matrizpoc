import type { TenantId } from "@matriz/foundation-types"
import type {
  GoalRepository,
  ActivityRepository,
  RewardRuleRepository,
} from "../domain/repositories"
import type { Goal, GoalId, ActivityRecord, ActivityId, RewardRule } from "../domain/models"
import { seedGoals, seedActivities, seedRewardRules } from "./seeds"

export function createGoalRepository(): GoalRepository {
  const store = new Map<GoalId, Goal>()
  for (const g of seedGoals) store.set(g.id, g)

  return {
    async list(tenantId: TenantId) {
      return [...store.values()].filter((g) => g.tenantId === tenantId)
    },
    async getById(tenantId, id) {
      const g = store.get(id)
      return g && g.tenantId === tenantId ? g : null
    },
    async create(goal) {
      store.set(goal.id, goal)
      return goal
    },
    async update(goal) {
      store.set(goal.id, goal)
      return goal
    },
  }
}

export function createActivityRepository(): ActivityRepository {
  const store = new Map<ActivityId, ActivityRecord>()
  for (const a of seedActivities) store.set(a.id, a)

  return {
    async list(tenantId) {
      return [...store.values()]
        .filter((a) => a.tenantId === tenantId)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    },
    async listByGoal(tenantId, goalId) {
      return [...store.values()]
        .filter((a) => a.tenantId === tenantId && a.goalId === goalId)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    },
    async getById(tenantId, id) {
      const a = store.get(id)
      return a && a.tenantId === tenantId ? a : null
    },
    async create(activity) {
      store.set(activity.id, activity)
      return activity
    },
  }
}

export function createRewardRuleRepository(): RewardRuleRepository {
  return {
    async list(tenantId) {
      return seedRewardRules.filter((r) => r.tenantId === tenantId) as readonly RewardRule[]
    },
  }
}
