/**
 * SharedOnboardingPayload + payloads especificos por app (v1).
 *
 * Onboarding compartilhado coleta dados comuns (tenant, branding, apps
 * habilitados, operacao) e cada app pode estender com um shape proprio.
 * Shape espelha o futuro Prisma mas sem banco real na V1.
 */
import { z } from "zod";
export declare const tenantBasicsSchema: z.ZodObject<{
    tenantName: z.ZodString;
    legalName: z.ZodOptional<z.ZodString>;
    taxId: z.ZodOptional<z.ZodString>;
    country: z.ZodString;
}, "strip", z.ZodTypeAny, {
    tenantName: string;
    country: string;
    legalName?: string | undefined;
    taxId?: string | undefined;
}, {
    tenantName: string;
    country: string;
    legalName?: string | undefined;
    taxId?: string | undefined;
}>;
export declare const brandingSchema: z.ZodObject<{
    primaryColor: z.ZodString;
    accentColor: z.ZodOptional<z.ZodString>;
    logoText: z.ZodString;
}, "strip", z.ZodTypeAny, {
    primaryColor: string;
    logoText: string;
    accentColor?: string | undefined;
}, {
    primaryColor: string;
    logoText: string;
    accentColor?: string | undefined;
}>;
export declare const operationBasicsSchema: z.ZodObject<{
    timezone: z.ZodString;
    currency: z.ZodString;
    defaultLanguage: z.ZodString;
}, "strip", z.ZodTypeAny, {
    timezone: string;
    currency: string;
    defaultLanguage: string;
}, {
    timezone: string;
    currency: string;
    defaultLanguage: string;
}>;
export declare const sharedOnboardingPayloadSchema: z.ZodObject<{
    tenantId: z.ZodString;
    tenant: z.ZodObject<{
        tenantName: z.ZodString;
        legalName: z.ZodOptional<z.ZodString>;
        taxId: z.ZodOptional<z.ZodString>;
        country: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        tenantName: string;
        country: string;
        legalName?: string | undefined;
        taxId?: string | undefined;
    }, {
        tenantName: string;
        country: string;
        legalName?: string | undefined;
        taxId?: string | undefined;
    }>;
    branding: z.ZodObject<{
        primaryColor: z.ZodString;
        accentColor: z.ZodOptional<z.ZodString>;
        logoText: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        primaryColor: string;
        logoText: string;
        accentColor?: string | undefined;
    }, {
        primaryColor: string;
        logoText: string;
        accentColor?: string | undefined;
    }>;
    enabledApps: z.ZodArray<z.ZodEnum<["matriz-identity", "matriz-hub", "matriz-workbench", "sites", "spot", "seumei", "contracts", "willdash"]>, "many">;
    operation: z.ZodObject<{
        timezone: z.ZodString;
        currency: z.ZodString;
        defaultLanguage: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        timezone: string;
        currency: string;
        defaultLanguage: string;
    }, {
        timezone: string;
        currency: string;
        defaultLanguage: string;
    }>;
    startedAt: z.ZodString;
    completedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    tenant: {
        tenantName: string;
        country: string;
        legalName?: string | undefined;
        taxId?: string | undefined;
    };
    branding: {
        primaryColor: string;
        logoText: string;
        accentColor?: string | undefined;
    };
    enabledApps: ("matriz-identity" | "matriz-hub" | "matriz-workbench" | "sites" | "spot" | "seumei" | "contracts" | "willdash")[];
    operation: {
        timezone: string;
        currency: string;
        defaultLanguage: string;
    };
    startedAt: string;
    completedAt?: string | undefined;
}, {
    tenantId: string;
    tenant: {
        tenantName: string;
        country: string;
        legalName?: string | undefined;
        taxId?: string | undefined;
    };
    branding: {
        primaryColor: string;
        logoText: string;
        accentColor?: string | undefined;
    };
    enabledApps: ("matriz-identity" | "matriz-hub" | "matriz-workbench" | "sites" | "spot" | "seumei" | "contracts" | "willdash")[];
    operation: {
        timezone: string;
        currency: string;
        defaultLanguage: string;
    };
    startedAt: string;
    completedAt?: string | undefined;
}>;
export type SharedOnboardingPayload = z.infer<typeof sharedOnboardingPayloadSchema>;
export declare const spotOnboardingPayloadSchema: z.ZodObject<{
    artistName: z.ZodString;
    mainGenre: z.ZodString;
    bandFocus: z.ZodEnum<["solo", "band", "dj", "collective"]>;
    seeksContracts: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    artistName: string;
    mainGenre: string;
    bandFocus: "solo" | "band" | "dj" | "collective";
    seeksContracts: boolean;
}, {
    artistName: string;
    mainGenre: string;
    bandFocus: "solo" | "band" | "dj" | "collective";
    seeksContracts?: boolean | undefined;
}>;
export type SpotOnboardingPayload = z.infer<typeof spotOnboardingPayloadSchema>;
export declare const seumeiOnboardingPayloadSchema: z.ZodObject<{
    establishmentType: z.ZodEnum<["bar", "restaurant", "club", "cafe", "other"]>;
    operationMode: z.ZodEnum<["dine-in", "delivery", "both"]>;
    serviceRadiusKm: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    serviceRadiusKm: number;
    establishmentType: "other" | "bar" | "restaurant" | "club" | "cafe";
    operationMode: "dine-in" | "delivery" | "both";
}, {
    establishmentType: "other" | "bar" | "restaurant" | "club" | "cafe";
    operationMode: "dine-in" | "delivery" | "both";
    serviceRadiusKm?: number | undefined;
}>;
export type SeumeiOnboardingPayload = z.infer<typeof seumeiOnboardingPayloadSchema>;
export declare const contractsOnboardingPayloadSchema: z.ZodObject<{
    defaultTemplate: z.ZodEnum<["gig-standard", "establishment-service", "custom"]>;
    autoLinkEntities: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    defaultTemplate: "custom" | "gig-standard" | "establishment-service";
    autoLinkEntities: boolean;
}, {
    defaultTemplate: "custom" | "gig-standard" | "establishment-service";
    autoLinkEntities?: boolean | undefined;
}>;
export type ContractsOnboardingPayload = z.infer<typeof contractsOnboardingPayloadSchema>;
export declare const willdashOnboardingPayloadSchema: z.ZodObject<{
    goalPreference: z.ZodEnum<["revenue", "gigs-count", "customer-count", "custom"]>;
    rewardStyle: z.ZodDefault<z.ZodEnum<["points", "badges", "both"]>>;
}, "strip", z.ZodTypeAny, {
    goalPreference: "custom" | "revenue" | "gigs-count" | "customer-count";
    rewardStyle: "both" | "points" | "badges";
}, {
    goalPreference: "custom" | "revenue" | "gigs-count" | "customer-count";
    rewardStyle?: "both" | "points" | "badges" | undefined;
}>;
export type WilldashOnboardingPayload = z.infer<typeof willdashOnboardingPayloadSchema>;
/** Map app -> payload schema para extensoes especificas. */
export declare const appOnboardingPayloadSchemas: {
    readonly "matriz-identity": z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
    readonly "matriz-hub": z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
    readonly "matriz-workbench": z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
    readonly sites: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
    readonly spot: z.ZodObject<{
        artistName: z.ZodString;
        mainGenre: z.ZodString;
        bandFocus: z.ZodEnum<["solo", "band", "dj", "collective"]>;
        seeksContracts: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        artistName: string;
        mainGenre: string;
        bandFocus: "solo" | "band" | "dj" | "collective";
        seeksContracts: boolean;
    }, {
        artistName: string;
        mainGenre: string;
        bandFocus: "solo" | "band" | "dj" | "collective";
        seeksContracts?: boolean | undefined;
    }>;
    readonly seumei: z.ZodObject<{
        establishmentType: z.ZodEnum<["bar", "restaurant", "club", "cafe", "other"]>;
        operationMode: z.ZodEnum<["dine-in", "delivery", "both"]>;
        serviceRadiusKm: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        serviceRadiusKm: number;
        establishmentType: "other" | "bar" | "restaurant" | "club" | "cafe";
        operationMode: "dine-in" | "delivery" | "both";
    }, {
        establishmentType: "other" | "bar" | "restaurant" | "club" | "cafe";
        operationMode: "dine-in" | "delivery" | "both";
        serviceRadiusKm?: number | undefined;
    }>;
    readonly contracts: z.ZodObject<{
        defaultTemplate: z.ZodEnum<["gig-standard", "establishment-service", "custom"]>;
        autoLinkEntities: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        defaultTemplate: "custom" | "gig-standard" | "establishment-service";
        autoLinkEntities: boolean;
    }, {
        defaultTemplate: "custom" | "gig-standard" | "establishment-service";
        autoLinkEntities?: boolean | undefined;
    }>;
    readonly willdash: z.ZodObject<{
        goalPreference: z.ZodEnum<["revenue", "gigs-count", "customer-count", "custom"]>;
        rewardStyle: z.ZodDefault<z.ZodEnum<["points", "badges", "both"]>>;
    }, "strip", z.ZodTypeAny, {
        goalPreference: "custom" | "revenue" | "gigs-count" | "customer-count";
        rewardStyle: "both" | "points" | "badges";
    }, {
        goalPreference: "custom" | "revenue" | "gigs-count" | "customer-count";
        rewardStyle?: "both" | "points" | "badges" | undefined;
    }>;
};
//# sourceMappingURL=onboarding.d.ts.map