import { z } from "zod"

export const controlHostHealthSchema = z.object({
  version: z.literal("v1"),
  sampledAt: z.string().datetime(),
  openTabs: z.number().int().nonnegative(),
  suspendedTabs: z.number().int().nonnegative(),
})

export type ControlHostHealthDTO = z.infer<typeof controlHostHealthSchema>

export const CONTROL_HOST_HEALTH_MESSAGE = "matriz.control.health.v1" as const
