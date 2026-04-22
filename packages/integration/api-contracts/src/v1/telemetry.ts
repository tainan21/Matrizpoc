/**
 * TelemetryEventDTO (v1) — envelope publico. Implementacao do motor vive em
 * packages/platform/telemetry. Aqui so declaramos a superficie do contrato.
 */
import { z } from "zod"
import { CONTRACT_VERSION_V1 } from "@matriz/foundation-constants"
import { appIdSchema } from "./manifest"

export const telemetryEventSchema = z.object({
  id: z.string().min(1),
  version: z.literal(CONTRACT_VERSION_V1),
  appId: appIdSchema,
  tenantId: z.string().min(1),
  name: z.string().min(1),
  occurredAt: z.string().datetime(),
  properties: z.record(z.string(), z.unknown()).default({}),
})
export type TelemetryEventDTO = z.infer<typeof telemetryEventSchema>
