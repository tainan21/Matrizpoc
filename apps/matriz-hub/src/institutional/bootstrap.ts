/**
 * Institutional bootstrap (Hub-side, V1.2).
 *
 * Monta o InstitutionalRegistry global a partir de:
 *   - local_contract_import dos 8 apps internos (via public-contract +
 *     decoration institucional Hub-side);
 *   - snapshot_pull da fonte externa institucional simulada
 *     "Matriz Ventures Registry" (seed JSON estatica).
 *
 * Idempotente: pode ser reexecutado por /api/refresh. O InstitutionalRegistry
 * faz swap atomico via replaceAll.
 *
 * L4: depende apenas de packages integration-* (registry-core, ingestion,
 * api-contracts). Nao importa dominio de nenhum app.
 * L11: bootstrap unico.
 */
import { manifest as hubManifest } from "../manifest/manifest"
import { manifest as matrizlibManifest } from "@apps/matrizlib/public-contract"
import { manifest as workbenchManifest } from "@apps/matriz-workbench/public-contract"
import { manifest as sitesManifest } from "@apps/sites/public-contract"
import { manifest as spotManifest } from "@apps/spot/public-contract"
import { manifest as matrizAdminManifest } from "@apps/matriz-admin/public-contract"
import { manifest as seumeiManifest } from "@apps/seumei/public-contract"
import { manifest as contractsManifest } from "@apps/contracts/public-contract"
import { manifest as willdashManifest } from "@apps/willdash/public-contract"
import { manifest as clientAdminManifest } from "@apps/matriz-client-admin/public-contract"
import { getGlobalInstitutionalRegistry } from "@matriz/integration-registry-core/institutional"
import {
  createIngestionPipeline,
  createLocalContractImportAdapter,
  createSnapshotPullAdapter,
  type IngestionPipelineRun,
} from "@matriz/integration-ingestion"
import type { AppManifestDTO } from "@matriz/integration-api-contracts"
import { decorationFor } from "./internal-apps-enrichment"
import venturesSeed from "./seeds/matriz-ventures-registry.json"

export interface InstitutionalBootstrapReport {
  readonly run: IngestionPipelineRun
  readonly accepted: number
  readonly rejected: ReadonlyArray<{ projectIdHint: string; message: string }>
  readonly replacedAt: string
}

let cached: InstitutionalBootstrapReport | undefined

const INTERNAL_MANIFESTS: readonly AppManifestDTO[] = [
  hubManifest,
  matrizlibManifest,
  workbenchManifest,
  sitesManifest,
  spotManifest,
  matrizAdminManifest,
  seumeiManifest,
  contractsManifest,
  willdashManifest,
  clientAdminManifest,
]

/**
 * Executa a ingestao institucional e aplica swap atomico no registry global.
 * Idempotente.
 */
export async function runInstitutionalIngestion(): Promise<InstitutionalBootstrapReport> {
  const registry = getGlobalInstitutionalRegistry()

  const internalAdapter = createLocalContractImportAdapter({
    id: "local:matriz-monorepo",
    apps: INTERNAL_MANIFESTS.map((m) => ({
      manifest: m,
      decoration: decorationFor(m),
    })),
  })

  const venturesAdapter = createSnapshotPullAdapter({
    id: "snapshot:matriz-ventures-registry",
    sourceHint: "matriz-ventures-registry",
    supports: ["institutional_source"],
    fetchSnapshot: async () => venturesSeed,
  })

  const pipeline = createIngestionPipeline({
    adapters: [internalAdapter, venturesAdapter],
  })

  const run = await pipeline.run()
  const replaced = registry.replaceAll(run.projects)

  cached = {
    run,
    accepted: replaced.accepted,
    rejected: replaced.rejected,
    replacedAt: replaced.replacedAt,
  }
  return cached
}

export function getLastInstitutionalReport(): InstitutionalBootstrapReport | undefined {
  return cached
}
