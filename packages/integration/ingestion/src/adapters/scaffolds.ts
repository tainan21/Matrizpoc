/**
 * Scaffolds tipados para os 3 modos ainda nao implementados em V1.2.
 *
 * Apresentam a superficie real (IngestionAdapter), mas `ingest()` rejeita
 * com NotImplementedIngestionError. Existem para que docs, auditoria e
 * presenters do Hub tenham objetos reais para referenciar.
 */
import type { SourceClassification } from "@matriz/integration-api-contracts/v1/institutional"
import {
  NotImplementedIngestionError,
  type IngestionAdapter,
  type IngestionContext,
} from "../types"

export interface ScaffoldAdapterOptions {
  id: string
  supports: readonly SourceClassification[]
}

export function createApiPullAdapter(opts: ScaffoldAdapterOptions): IngestionAdapter {
  return {
    id: opts.id,
    mode: "api_pull",
    supports: opts.supports,
    async ingest(_ctx: IngestionContext) {
      throw new NotImplementedIngestionError(opts.id, "api_pull")
    },
  }
}

export function createWebhookPushAdapter(opts: ScaffoldAdapterOptions): IngestionAdapter {
  return {
    id: opts.id,
    mode: "webhook_push",
    supports: opts.supports,
    async ingest(_ctx: IngestionContext) {
      throw new NotImplementedIngestionError(opts.id, "webhook_push")
    },
  }
}

export function createManualRegistrationAdapter(
  opts: ScaffoldAdapterOptions,
): IngestionAdapter {
  return {
    id: opts.id,
    mode: "manual_registration",
    supports: opts.supports,
    async ingest(_ctx: IngestionContext) {
      throw new NotImplementedIngestionError(opts.id, "manual_registration")
    },
  }
}
