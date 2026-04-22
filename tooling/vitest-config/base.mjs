import { defineConfig } from "vitest/config"

/**
 * Base vitest preset for packages and apps that want local tests.
 * The canonical smoke-tests config lives at the monorepo root
 * (vitest.config.ts). This preset is for future unit tests.
 */
export const matrizBaseVitestConfig = defineConfig({
  test: {
    environment: "node",
    globals: false,
    passWithNoTests: true,
  },
})

export default matrizBaseVitestConfig
