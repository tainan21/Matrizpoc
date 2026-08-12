/**
 * AppManifestDTO + RegistryEntryDTO + SharedAppNavigationDTO (v1).
 *
 * L2: o manifest é a fonte de verdade do app. Esse DTO é o contrato publico
 * que qualquer outro app pode importar para ler manifest alheio sem acoplar.
 * L7: versionado em v1. Qualquer evolucao vira v2 ao lado sem quebrar.
 */
import { z } from "zod";
import { MATRIZ_APP_IDS, MATRIZ_EVENT_NAMES, CONTRACT_VERSION_V1, } from "@matriz/foundation-constants";
export const appIdSchema = z.enum(MATRIZ_APP_IDS);
export const matrizEventNameSchema = z.enum(MATRIZ_EVENT_NAMES);
export const navigationEntrySchema = z.object({
    label: z.string().min(1),
    path: z.string().startsWith("/"),
    icon: z.string().optional(),
    order: z.number().int().nonnegative().default(0),
});
export const appCapabilitySchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().min(1),
});
export const appIntegrationSchema = z.object({
    targetAppId: appIdSchema,
    kind: z.enum(["gateway", "event-producer", "event-consumer", "external-link"]),
    description: z.string().min(1),
});
export const onboardingSupportSchema = z.object({
    participates: z.boolean(),
    hasSpecificStep: z.boolean(),
    specificStepTitle: z.string().min(1).optional(),
});
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
        .array(z.object({
        id: z.string(),
        name: z.string(),
        description: z.string(),
    }))
        .default([]),
});
export const registryEntrySchema = z.object({
    appId: appIdSchema,
    manifest: appManifestSchema,
    baseUrl: z.string().min(1),
    enabled: z.boolean(),
    registeredAt: z.string().datetime(),
});
export const sharedAppNavigationSchema = z.object({
    appId: appIdSchema,
    label: z.string().min(1),
    primaryRoute: z.string().startsWith("/"),
    baseUrl: z.string().min(1),
    routes: z.array(navigationEntrySchema),
});
//# sourceMappingURL=manifest.js.map