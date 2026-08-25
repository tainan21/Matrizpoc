import type { AppManifestDTO } from "@matriz/integration-api-contracts"

export const manifest: AppManifestDTO = {
  appId: "matriz-identity",
  name: "Matriz Identity",
  description: "Provedor OIDC e autoridade central de identidade da plataforma Matriz.",
  version: "0.1.0",
  contractVersion: "v1",
  primaryRoute: "/.well-known/openid-configuration",
  routes: [{ label: "OIDC discovery", path: "/.well-known/openid-configuration", order: 0 }],
  capabilities: [{ id: "identity.oidc.authenticate", name: "Autenticar via OIDC", description: "Emite tokens OIDC após fluxo Authorization Code com PKCE." }],
  eventsProduced: [],
  eventsConsumed: [],
  integrations: [],
  onboardingSupport: { participates: false, hasSpecificStep: false },
  navigationEntry: { label: "Identity", path: "/.well-known/openid-configuration", order: 0 },
  ownership: { domainSummary: "OIDC, credenciais globais e autorização de memberships/grants.", maintainers: ["matriz-identity"] },
  widgets: [],
}

export type MatrizIdentityManifest = typeof manifest
