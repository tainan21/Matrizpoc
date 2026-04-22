import {
  createGoalRepository,
  createActivityRepository,
  createRewardRuleRepository,
} from "../mock/repositories"
import { createUseCases, type WilldashUseCases } from "../application/use-cases"

interface Container {
  useCases: WilldashUseCases
}

let container: Container | undefined

export function getWilldashContainer(): Container {
  if (!container) {
    const goals = createGoalRepository()
    const activities = createActivityRepository()
    const rewardRules = createRewardRuleRepository()
    container = { useCases: createUseCases({ goals, activities, rewardRules }) }
  }
  return container
}
