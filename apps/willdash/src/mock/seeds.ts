import { asTenantId, asISODate } from "@matriz/foundation-types"
import type {
  Dashboard,
  DashboardId,
  WidgetId,
  Goal,
  GoalId,
  ActivityRecord,
  ActivityId,
  RewardRule,
  RewardRuleId,
} from "../domain/models"

const ACME = asTenantId("tenant-acme")
const DEMO = asTenantId("tenant-demo")
const NOW = asISODate("2026-01-10T10:00:00.000Z")

// ---- Dashboards ----
export const seedDashboards: Dashboard[] = [
  {
    id: "dash-operacional" as DashboardId,
    tenantId: ACME,
    name: "Visao operacional",
    description: "Eventos por app e contratos criados no periodo.",
    widgets: [
      {
        id: "w-spot-gigs" as WidgetId,
        title: "Gigs publicados (Spot)",
        kind: "counter",
        sourceApp: "spot",
        metric: "spot.gig.created",
      },
      {
        id: "w-seumei-estabs" as WidgetId,
        title: "Estabelecimentos selecionados (Seumei)",
        kind: "counter",
        sourceApp: "seumei",
        metric: "seumei.establishment.selected",
      },
      {
        id: "w-contracts" as WidgetId,
        title: "Contratos criados",
        kind: "timeline",
        sourceApp: "contracts",
        metric: "contract.created",
      },
    ],
    createdAt: NOW,
  },
  {
    id: "dash-onboarding" as DashboardId,
    tenantId: ACME,
    name: "Onboarding cross-app",
    description: "Conclusao do onboarding por app.",
    widgets: [
      {
        id: "w-onb-completed" as WidgetId,
        title: "Onboardings concluidos",
        kind: "breakdown",
        sourceApp: "matriz-hub",
        metric: "onboarding.completed",
      },
    ],
    createdAt: NOW,
  },
]

// ---- Goals ----
export const seedGoals: Goal[] = [
  {
    id: "goal-shows-mes" as GoalId,
    tenantId: ACME,
    title: "Fechar 8 shows este mes",
    description: "Contratos assinados originados em Spot ou Seumei.",
    targetValue: 8,
    currentValue: 3,
    unit: "contratos",
    status: "active",
    dueAt: asISODate("2026-01-31T23:59:59.000Z"),
    createdAt: NOW,
  },
  {
    id: "goal-onboarding" as GoalId,
    tenantId: ACME,
    title: "Onboarding de 5 tenants",
    description: "Novos tenants completando onboarding compartilhado.",
    targetValue: 5,
    currentValue: 1,
    unit: "tenants",
    status: "active",
    createdAt: NOW,
  },
  {
    id: "goal-demo" as GoalId,
    tenantId: DEMO,
    title: "Ativar primeiro espaco",
    description: "Primeiro establishment no Seumei.",
    targetValue: 1,
    currentValue: 0,
    unit: "establishments",
    status: "active",
    createdAt: NOW,
  },
]

// ---- Activities ----
export const seedActivities: ActivityRecord[] = [
  {
    id: "act-001" as ActivityId,
    tenantId: ACME,
    goalId: "goal-shows-mes" as GoalId,
    kind: "milestone",
    note: "Contrato #1 assinado (Spot).",
    value: 1,
    createdAt: asISODate("2026-01-08T14:00:00.000Z"),
  },
  {
    id: "act-002" as ActivityId,
    tenantId: ACME,
    goalId: "goal-shows-mes" as GoalId,
    kind: "milestone",
    note: "Contrato #2 assinado (Seumei).",
    value: 1,
    createdAt: asISODate("2026-01-09T11:30:00.000Z"),
  },
  {
    id: "act-003" as ActivityId,
    tenantId: ACME,
    kind: "check-in",
    note: "Revisao semanal de metas.",
    value: 0,
    createdAt: asISODate("2026-01-10T09:00:00.000Z"),
  },
]

// ---- Reward rules ----
export const seedRewardRules: RewardRule[] = [
  {
    id: "rr-contracts-meta" as RewardRuleId,
    tenantId: ACME,
    title: "Bater meta mensal de contratos",
    trigger: "goal.completed",
    rewardLabel: "Badge prata + destaque no Hub",
    active: true,
  },
  {
    id: "rr-onboarding" as RewardRuleId,
    tenantId: ACME,
    title: "Primeiro onboarding concluido",
    trigger: "onboarding.completed",
    rewardLabel: "Cupom de boas-vindas",
    active: true,
  },
]
