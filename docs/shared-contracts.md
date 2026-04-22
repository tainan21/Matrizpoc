# Shared Contracts

> Esqueleto. Expandido em CP-2.

DTOs públicos vivem em `packages/integration/api-contracts/src/v1/`.
Barrel `src/index.ts` re-exporta v1 como default.

## DTOs obrigatórios (ver L7)

- `CreateContractInput`, `CreateContractFromGigInput`, `CreateContractFromEstablishmentInput`
- `SharedOnboardingPayload`, `SpotOnboardingPayload`, `SeumeiOnboardingPayload`,
  `ContractsOnboardingPayload`, `WilldashOnboardingPayload`
- `AppManifestDTO`, `RegistryEntryDTO`, `ExternalLinkDTO`, `TelemetryEventDTO`
- `GigSummaryDTO`, `EstablishmentSummaryDTO`, `ContractSummaryDTO`
- `SharedAppNavigationDTO`

## Versionamento (L7)

- Cada DTO mora em `v1/`. Mudanças breaking abrem `v2/`.
- Apps migram individualmente.
- Envelope de evento carrega `version: "v1"`.
- Manifest tem `contractVersion: "v1"`.
