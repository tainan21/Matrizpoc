import type { AppManifestDTO } from "@matriz/integration-api-contracts"

export const manifest: AppManifestDTO = {
  appId: "matriz-ops",
  name: "Matriz Ops",
  description: "Backoffice interno para identidade, acessos, plataformas, telemetria, wallets e auditoria.",
  version: "0.1.0",
  contractVersion: "v1",
  primaryRoute: "/",
  routes: [
    { label: "Visão Geral", path: "/", order: 0 },
    { label: "Usuários", path: "/users", order: 1 },
    { label: "Plataformas", path: "/platforms", order: 2 },
    { label: "Telemetria", path: "/telemetry", order: 3 },
    { label: "Wallets", path: "/wallets", order: 4 },
    { label: "Financeiro", path: "/finance", order: 5 },
    { label: "Auditoria", path: "/audit", order: 6 },
    { label: "Ajustes", path: "/settings", order: 7 },
  ],
  capabilities: [
    { id: "ops.users.manage", name: "Administrar usuários", description: "Opera perfil, sessões, tenants e grants com step-up." },
    { id: "ops.telemetry.read", name: "Consultar telemetria", description: "Exibe agregados persistentes do Hub." },
    { id: "ops.wallet.adjust", name: "Ajustar MTRZ", description: "Solicita lançamentos auditáveis ao Matriz Pay." },
  ],
  eventsProduced: [],
  eventsConsumed: ["wallet.created", "wallet.entry.posted", "wallet.entry.reversed", "wallet.reconciliation.failed"],
  integrations: [
    { targetAppId: "matriz-hub", kind: "gateway", description: "Consulta registry e telemetria persistida." },
    { targetAppId: "matriz-pay", kind: "gateway", description: "Opera wallets por API autenticada e contratos v1." },
  ],
  onboardingSupport: { participates: false, hasSpecificStep: false },
  navigationEntry: { label: "Ops", path: "/", order: 90 },
  ownership: { domainSummary: "Operação interna, políticas administrativas e auditoria sanitizada.", maintainers: ["matriz-platform"] },
  widgets: [],
}

export type MatrizOpsManifest = typeof manifest
