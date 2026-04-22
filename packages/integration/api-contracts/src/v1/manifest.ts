/**
 * AppManifestDTO + RegistryEntryDTO + SharedAppNavigationDTO (v1).
 *
 * L2: o manifest é a fonte de verdade do app. Esse DTO é o contrato publico
 * que qualquer outro app pode importar para ler manifest alheio sem acoplar.
 * L7: versionado em v1. Qualquer evolucao vira v2 ao lado sem quebrar.
 */
import { z } from "zod"
import {
  MATRIZ_APP_IDS,
  MATRIZ_EVENT_NAMES,
  CONTRACT_VERSION_V1,
} from "@matriz/foundation-constants"

export const appIdSchema = z.enum(MATRIZ_APP_IDS)
export type AppIdValue = z.infer<typeof appIdSchema>

export const matrizEventNameSchema = z.enum(MATRIZ_EVENT_NAMES)
export type MatrizEventName = z.infer<typeof matrizEventNameSchema>

export const navigationEntrySchema = z.object({
  label: z.string().min(1),
  path: z.string().startsWith("/"),
  icon: z.string().optional(),
  order: z.number().int().nonnegative().default(0),
})
export type NavigationEntryDTO = z.infer<typeof navigationEntrySchema>

export const appCapabilitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
})
export type AppCapabilityDTO = z.infer<typeof appCapabilitySchema>

export const appIntegrationSchema = z.object({
  targetAppId: appIdSchema,
  kind: z.enum(["gateway", "event-producer", "event-consumer", "external-link"]),
  description: z.string().min(1),
})
export type AppIntegrationDTO = z.infer<typeof appIntegrationSchema>

export const onboardingSupportSchema = z.object({
  participates: z.boolean(),
  hasSpecificStep: z.boolean(),
  specificStepTitle: z.string().min(1).optional(),
})
export type OnboardingSupportDTO = z.infer<typeof onboardingSupportSchema>

export const appManifestSchema = z.object({
  appId: appIdSchema,
  name: z.string().min(1),
  description: z.string().min(1),
  version: z.string().min(1),
  contractVersion: z.literal(CONTRACT_VERSION_V1),
  routes: z.array(navigationEntrySchema).min(1),
  primaryRoute: z.string().startsWith("/"),
  capabilities: z.array(appCapabilitySchema),
  eventsProduced: z.array(z.enum(MATRIZ_EVENT_NAMES)),
  eventsConsumed: z.array(z.enum(MATRIZ_EVENT_NAMES)),
  integrations: z.array(appIntegrationSchema),
  onboardingSupport: onboardingSupportSchema,
  navigationEntry: navigationEntrySchema,
  ownership: z.object({
    domainSummary: z.string().min(1),
    maintainers: z.array(z.string()).default([]),
  }),
  widgets: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        description: z.string(),
      }),
    )
    .default([]),
})
export type AppManifestDTO = z.infer<typeof appManifestSchema>

export const registryEntrySchema = z.object({
  appId: appIdSchema,
  manifest: appManifestSchema,
  baseUrl: z.string().min(1),
  enabled: z.boolean(),
  registeredAt: z.string().datetime(),
})
export type RegistryEntryDTO = z.infer<typeof registryEntrySchema>

export const sharedAppNavigationSchema = z.object({
  appId: appIdSchema,
  label: z.string().min(1),
  primaryRoute: z.string().startsWith("/"),
  baseUrl: z.string().min(1),
  routes: z.array(navigationEntrySchema),
})
export type SharedAppNavigationDTO = z.infer<typeof sharedAppNavigationSchema>
