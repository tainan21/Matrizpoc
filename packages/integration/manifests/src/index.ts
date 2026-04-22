/**
 * @matriz/integration-manifests
 *
 * Helpers sobre AppManifestDTO. O tipo em si mora em api-contracts (v1) porque
 * e contrato publico. Aqui moram apenas utilitarios e mappers neutros.
 *
 * L2: este package NAO contem manifests estaticos. Os manifests sao declarados
 * em apps/<app>/src/manifest/manifest.ts (fonte de verdade) e expostos via
 * apps/<app>/public-contract.ts.
 */
import {
  appManifestSchema,
  type AppManifestDTO,
  type RegistryEntryDTO,
} from "@matriz/integration-api-contracts"
import { nowIso } from "@matriz/foundation-utils"

/** Valida um manifest contra o schema Zod da v1. Lanca se invalido. */
export function validateManifest(input: unknown): AppManifestDTO {
  return appManifestSchema.parse(input)
}

/** Safe parse version — util para validacoes em runtime com feedback. */
export function safeValidateManifest(
  input: unknown,
): { ok: true; manifest: AppManifestDTO } | { ok: false; issues: string[] } {
  const r = appManifestSchema.safeParse(input)
  if (r.success) return { ok: true, manifest: r.data }
  return {
    ok: false,
    issues: r.error.issues.map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`),
  }
}

/** Mapper: manifest -> entrada de registry pronta para uso pelo Hub. */
export function manifestToRegistryEntry(
  manifest: AppManifestDTO,
  opts: { baseUrl: string; enabled?: boolean },
): RegistryEntryDTO {
  return {
    appId: manifest.appId,
    manifest,
    baseUrl: opts.baseUrl,
    enabled: opts.enabled ?? true,
    registeredAt: nowIso(),
  }
}

/** Summariza manifest para logs/debug sem expor tudo. */
export function summarizeManifest(
  manifest: AppManifestDTO,
): { appId: string; name: string; version: string; capabilities: number; routes: number } {
  return {
    appId: manifest.appId,
    name: manifest.name,
    version: manifest.version,
    capabilities: manifest.capabilities.length,
    routes: manifest.routes.length,
  }
}

export const INTEGRATION_MANIFESTS_VERSION = "1.0.0" as const
