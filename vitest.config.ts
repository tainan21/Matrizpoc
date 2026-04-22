import { defineConfig } from "vitest/config"
import { resolve } from "node:path"

/**
 * Root vitest configuration for smoke tests.
 *
 * Governed by Architectural Law L8 — smoke tests of public contracts.
 * These tests protect the most sensitive surfaces of the monorepo:
 *   - manifests (the source of truth per app — L2)
 *   - registry (discovery of apps and capabilities)
 *   - DTOs (api-contracts v1)
 *   - external links (cross-app reference integrity)
 *   - events (bus envelope and routing)
 */
export default defineConfig({
  test: {
    include: ["tests/smoke/**/*.test.ts"],
    environment: "node",
    globals: false,
    reporters: ["default"],
    passWithNoTests: false,
  },
  resolve: {
    alias: {
      "@matriz/foundation-types": resolve(__dirname, "./packages/foundation/types/src/index.ts"),
      "@matriz/foundation-utils": resolve(__dirname, "./packages/foundation/utils/src/index.ts"),
      "@matriz/foundation-constants": resolve(__dirname, "./packages/foundation/constants/src/index.ts"),
      "@matriz/foundation-schemas": resolve(__dirname, "./packages/foundation/schemas/src/index.ts"),
      "@matriz/platform-storage": resolve(__dirname, "./packages/platform/storage/src/index.ts"),
      "@matriz/platform-auth/client": resolve(__dirname, "./packages/platform/auth/src/client.ts"),
      "@matriz/platform-auth/server": resolve(__dirname, "./packages/platform/auth/src/server.ts"),
      "@matriz/platform-auth/v1": resolve(__dirname, "./packages/platform/auth/src/v1/index.ts"),
      "@matriz/platform-auth": resolve(__dirname, "./packages/platform/auth/src/index.ts"),
      "@matriz/access-tenants": resolve(__dirname, "./packages/access/tenants/src/index.ts"),
      "@matriz/integration-api-contracts/v1/institutional": resolve(__dirname, "./packages/integration/api-contracts/src/v1/institutional/index.ts"),
      "@matriz/integration-api-contracts/v1": resolve(__dirname, "./packages/integration/api-contracts/src/v1/index.ts"),
      "@matriz/integration-api-contracts": resolve(__dirname, "./packages/integration/api-contracts/src/index.ts"),
      "@matriz/integration-events": resolve(__dirname, "./packages/integration/events/src/index.ts"),
      "@matriz/integration-external-links": resolve(__dirname, "./packages/integration/external-links/src/index.ts"),
      "@matriz/integration-manifests": resolve(__dirname, "./packages/integration/manifests/src/index.ts"),
      "@matriz/integration-registry-core/institutional": resolve(__dirname, "./packages/integration/registry-core/src/institutional-registry.ts"),
      "@matriz/integration-registry-core": resolve(__dirname, "./packages/integration/registry-core/src/index.ts"),
      "@matriz/integration-ingestion": resolve(__dirname, "./packages/integration/ingestion/src/index.ts"),
      "@matriz/platform-config": resolve(__dirname, "./packages/platform/config/src/index.ts"),
      "@matriz/flows-onboarding": resolve(__dirname, "./packages/flows/onboarding/src/index.ts"),
      "@apps/matriz-hub/public-contract": resolve(__dirname, "./apps/matriz-hub/public-contract.ts"),
      "@apps/spot/public-contract": resolve(__dirname, "./apps/spot/public-contract.ts"),
      "@apps/seumei/public-contract": resolve(__dirname, "./apps/seumei/public-contract.ts"),
      "@apps/contracts/public-contract": resolve(__dirname, "./apps/contracts/public-contract.ts"),
      "@apps/willdash/public-contract": resolve(__dirname, "./apps/willdash/public-contract.ts"),
    },
  },
})
