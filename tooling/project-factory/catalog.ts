import {
  localAppRuntimes,
  type LocalAppRuntimeConfig,
} from "../../packages/platform/config/src/index"

export type LocalAppRuntime = LocalAppRuntimeConfig
export type LocalAppLifecycle = LocalAppRuntime["lifecycle"]
export const localAppCatalog: readonly LocalAppRuntime[] = localAppRuntimes
