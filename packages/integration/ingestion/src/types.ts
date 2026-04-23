/**
 * Interfaces canonicas do pipeline de ingestao institucional.
 *
 * Ver docs/ingestion-model.md.
 *
 * L4: pode importar de api-contracts. Nao importa design, flows, platform.
 * L12: domain-free. Apenas ProjectManifest institucional.
 */
import type {
  IngestionMode,
  ProjectManifest,
  SourceClassification,
} from "@matriz/integration-api-contracts/v1/institutional"

export interface IngestionLogger {
  info: (msg: string, meta?: unknown) => void
  warn: (msg: string, meta?: unknown) => void
  error: (msg: string, meta?: unknown) => void
}

export interface IngestionContext {
  now: Date
  logger: IngestionLogger
  fetchJson?: (url: string) => Promise<unknown>
}

export interface IngestionError {
  sourceHint: string
  message: string
}

export interface IngestionResult {
  adapterId: string
  mode: IngestionMode
  projects: ProjectManifest[]
  errors: IngestionError[]
  ranAt: string
  durationMs: number
}

export interface IngestionAdapter {
  readonly id: string
  readonly mode: IngestionMode
  readonly supports: readonly SourceClassification[]
  ingest(ctx: IngestionContext): Promise<IngestionResult>
}

export class NotImplementedIngestionError extends Error {
  override readonly name = "NotImplementedIngestionError"
  constructor(adapterId: string, mode: IngestionMode) {
    super(`Ingestion adapter "${adapterId}" (mode=${mode}) is scaffold-only in V1.2.`)
  }
}
