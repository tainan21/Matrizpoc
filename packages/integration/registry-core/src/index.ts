/**
 * @matriz/integration-registry-core
 *
 * L2: este package NAO envia manifests estaticos. Cada app e dono do proprio
 * manifest. O Registry aqui apenas RECEBE manifests (via registerApp) vindos
 * dos apps e oferece lookups.
 *
 * L3: consumidores (ex.: Hub) importam manifests de outros apps apenas pela
 * porta publica `@apps/<app>/public-contract`. Nada de alcancar src/ alheio.
 */
import type { AppIdLiteral } from "@matriz/foundation-types"
import type {
  AppManifestDTO,
  RegistryEntryDTO,
  MatrizEventName,
  SharedAppNavigationDTO,
} from "@matriz/integration-api-contracts"

type AppId = AppIdLiteral
import {
  manifestToRegistryEntry,
  validateManifest,
} from "@matriz/integration-manifests"

export interface RegistryRegisterOptions {
  baseUrl: string
  enabled?: boolean
}

export interface Registry {
  registerApp(manifest: AppManifestDTO, opts: RegistryRegisterOptions): RegistryEntryDTO
  unregisterApp(appId: AppId): boolean
  list(): readonly RegistryEntryDTO[]
  listEnabled(): readonly RegistryEntryDTO[]
  get(appId: AppId): RegistryEntryDTO | undefined
  findByCapability(capabilityId: string): readonly RegistryEntryDTO[]
  findByEventProduced(eventName: MatrizEventName): readonly RegistryEntryDTO[]
  findByEventConsumed(eventName: MatrizEventName): readonly RegistryEntryDTO[]
  findByIntegrationTarget(targetAppId: AppId): readonly RegistryEntryDTO[]
  findWithOnboardingSupport(): readonly RegistryEntryDTO[]
  toNavigation(): readonly SharedAppNavigationDTO[]
}

export function createRegistry(): Registry {
  const entries = new Map<AppId, RegistryEntryDTO>()

  return {
    registerApp(manifest, opts) {
      const safe = validateManifest(manifest)
      const entry = manifestToRegistryEntry(safe, opts)
      entries.set(entry.appId, entry)
      return entry
    },
    unregisterApp(appId) {
      return entries.delete(appId)
    },
    list() {
      return Array.from(entries.values())
    },
    listEnabled() {
      return Array.from(entries.values()).filter((e) => e.enabled)
    },
    get(appId) {
      return entries.get(appId)
    },
    findByCapability(capabilityId) {
      return Array.from(entries.values()).filter((e) =>
        e.manifest.capabilities.some((c) => c.id === capabilityId),
      )
    },
    findByEventProduced(eventName) {
      return Array.from(entries.values()).filter((e) =>
        e.manifest.eventsProduced.includes(eventName),
      )
    },
    findByEventConsumed(eventName) {
      return Array.from(entries.values()).filter((e) =>
        e.manifest.eventsConsumed.includes(eventName),
      )
    },
    findByIntegrationTarget(targetAppId) {
      return Array.from(entries.values()).filter((e) =>
        e.manifest.integrations.some((i) => i.targetAppId === targetAppId),
      )
    },
    findWithOnboardingSupport() {
      return Array.from(entries.values()).filter((e) => e.manifest.onboardingSupport.participates)
    },
    toNavigation() {
      return Array.from(entries.values()).map<SharedAppNavigationDTO>((e) => ({
        appId: e.appId,
        label: e.manifest.name,
        primaryRoute: e.manifest.primaryRoute,
        baseUrl: e.baseUrl,
        routes: e.manifest.routes,
      }))
    },
  }
}

// ---------- singleton helper (opcional, util para scripts e tests) ----------

const GLOBAL_KEY = Symbol.for("matriz.integration.registry")
type Globals = { [K: symbol]: Registry | undefined }
const globals = globalThis as unknown as Globals

export function getGlobalRegistry(): Registry {
  if (!globals[GLOBAL_KEY]) {
    globals[GLOBAL_KEY] = createRegistry()
  }
  return globals[GLOBAL_KEY]!
}

export const INTEGRATION_REGISTRY_CORE_VERSION = "1.0.0" as const
