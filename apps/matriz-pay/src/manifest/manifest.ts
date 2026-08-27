import type { AppManifestDTO } from "@matriz/integration-api-contracts"

export const manifest: AppManifestDTO = {
  appId: "matriz-pay",
  name: "Matriz Pay",
  description: "Serviço financeiro de wallets MTRZ/BRL, ledger, PSP e reconciliação.",
  version: "0.1.0",
  contractVersion: "v1",
  primaryRoute: "/",
  routes: [{ label: "Status", path: "/", order: 0 }],
  capabilities: [
    { id: "pay.wallet.read", name: "Consultar wallet", description: "Consulta contas e saldo derivado do ledger." },
    { id: "pay.mtrz.post", name: "Lançar MTRZ", description: "Registra emissão, retirada, transferência e reversão." },
    { id: "pay.brl.intent", name: "Criar intenção BRL", description: "Solicita movimentação ao PSP e aguarda confirmação." },
  ],
  eventsProduced: ["wallet.created", "wallet.entry.posted", "wallet.entry.reversed", "wallet.reconciliation.failed"],
  eventsConsumed: [],
  integrations: [],
  onboardingSupport: { participates: false, hasSpecificStep: false },
  navigationEntry: { label: "Pay", path: "/", order: 91 },
  ownership: { domainSummary: "Wallets, ledger financeiro imutável, integração PSP e reconciliação.", maintainers: ["matriz-pay"] },
  widgets: [],
}

export type MatrizPayManifest = typeof manifest
