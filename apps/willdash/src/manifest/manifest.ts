/**
 * WillDash — App Manifest (source of truth per L2).
 */
import type { AppManifestDTO } from "@matriz/integration-api-contracts"

export const manifest: AppManifestDTO = {
  appId: "willdash",
  name: "WillDash",
  description:
    "Metas e recompensas. Prova expansao do ecossistema consumindo onboarding compartilhado e telemetria base sem reestruturar a base.",
  version: "0.1.0",
  contractVersion: "v1",
  primaryRoute: "/",
  routes: [
    { label: "Dashboard", path: "/", order: 0 },
    { label: "Metas", path: "/goals", order: 1 },
    { label: "Atividades", path: "/activities", order: 2 },
    { label: "Telemetria", path: "/telemetry", order: 3 },
    { label: "Dashboards", path: "/dashboards", order: 4 },
    { label: "Onboarding", path: "/onboarding", order: 5 },
  ],
  capabilities: [
    { id: "willdash.goal.read", name: "Ler metas", description: "Lista metas cadastradas." },
    {
      id: "willdash.activity.read",
      name: "Ler atividades",
      description: "Lista atividades registradas nas metas.",
    },
    {
      id: "willdash.rewards.read",
      name: "Ler regras de recompensa",
      description: "Lista regras mock.",
    },
  ],
  eventsProduced: ["willdash.goal.opened", "willdash.activity.logged"],
  eventsConsumed: ["onboarding.completed", "contract.created"],
  integrations: [],
  onboardingSupport: {
    participates: true,
    hasSpecificStep: true,
    specificStepTitle: "Preferencias de metas",
  },
  navigationEntry: { label: "WillDash", path: "/", order: 4 },
  ownership: {
    domainSummary: "Dominio de metas, recompensas e atividade.",
    maintainers: ["matriz-willdash"],
  },
  widgets: [],
}

export type WilldashManifest = typeof manifest
