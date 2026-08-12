/**
 * SharedOnboardingPayload + payloads especificos por app (v1).
 *
 * Onboarding compartilhado coleta dados comuns (tenant, branding, apps
 * habilitados, operacao) e cada app pode estender com um shape proprio.
 * Shape espelha o futuro Prisma mas sem banco real na V1.
 */
import { z } from "zod";
import { appIdSchema } from "./manifest";
export const tenantBasicsSchema = z.object({
    tenantName: z.string().min(1),
    legalName: z.string().min(1).optional(),
    taxId: z.string().min(1).optional(),
    country: z.string().length(2),
});
export const brandingSchema = z.object({
    primaryColor: z.string().min(1),
    accentColor: z.string().min(1).optional(),
    logoText: z.string().min(1),
});
export const operationBasicsSchema = z.object({
    timezone: z.string().min(1),
    currency: z.string().length(3),
    defaultLanguage: z.string().min(2),
});
export const sharedOnboardingPayloadSchema = z.object({
    tenantId: z.string().min(1),
    tenant: tenantBasicsSchema,
    branding: brandingSchema,
    enabledApps: z.array(appIdSchema).min(1),
    operation: operationBasicsSchema,
    startedAt: z.string().datetime(),
    completedAt: z.string().datetime().optional(),
});
export const spotOnboardingPayloadSchema = z.object({
    artistName: z.string().min(1),
    mainGenre: z.string().min(1),
    bandFocus: z.enum(["solo", "band", "dj", "collective"]),
    seeksContracts: z.boolean().default(true),
});
export const seumeiOnboardingPayloadSchema = z.object({
    establishmentType: z.enum(["bar", "restaurant", "club", "cafe", "other"]),
    operationMode: z.enum(["dine-in", "delivery", "both"]),
    serviceRadiusKm: z.number().nonnegative().default(5),
});
export const contractsOnboardingPayloadSchema = z.object({
    defaultTemplate: z.enum(["gig-standard", "establishment-service", "custom"]),
    autoLinkEntities: z.boolean().default(true),
});
export const willdashOnboardingPayloadSchema = z.object({
    goalPreference: z.enum(["revenue", "gigs-count", "customer-count", "custom"]),
    rewardStyle: z.enum(["points", "badges", "both"]).default("points"),
});
/** Map app -> payload schema para extensoes especificas. */
export const appOnboardingPayloadSchemas = {
    "matriz-identity": z.object({}),
    "matriz-hub": z.object({}),
    "matriz-workbench": z.object({}),
    sites: z.object({}),
    spot: spotOnboardingPayloadSchema,
    seumei: seumeiOnboardingPayloadSchema,
    contracts: contractsOnboardingPayloadSchema,
    willdash: willdashOnboardingPayloadSchema,
};
//# sourceMappingURL=onboarding.js.map