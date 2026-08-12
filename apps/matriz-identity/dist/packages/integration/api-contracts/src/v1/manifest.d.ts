/**
 * AppManifestDTO + RegistryEntryDTO + SharedAppNavigationDTO (v1).
 *
 * L2: o manifest é a fonte de verdade do app. Esse DTO é o contrato publico
 * que qualquer outro app pode importar para ler manifest alheio sem acoplar.
 * L7: versionado em v1. Qualquer evolucao vira v2 ao lado sem quebrar.
 */
import { z } from "zod";
export declare const appIdSchema: z.ZodEnum<["matriz-identity", "matriz-hub", "matriz-workbench", "sites", "spot", "seumei", "contracts", "willdash"]>;
export type AppIdValue = z.infer<typeof appIdSchema>;
export declare const matrizEventNameSchema: z.ZodEnum<["onboarding.completed", "spot.gig.created", "seumei.establishment.selected", "contract.created", "contract.linked", "hub.app.opened", "willdash.goal.opened", "willdash.activity.logged", "docs.document.created", "docs.document.imported", "docs.document.converted", "docs.document.version.created", "docs.document.version.published", "docs.document.deprecated", "docs.block.created", "docs.entity.created", "docs.entity.detected", "docs.relation.suggested", "docs.relation.approved", "docs.relation.rejected", "docs.suggestion.created", "docs.suggestion.accepted", "docs.suggestion.rejected", "docs.context.created", "docs.context.updated", "docs.context.published", "docs.mcp.read", "docs.mcp.refreshed", "docs.taskCandidate.created", "docs.governanceCandidate.created", "docs.export.generated", "docs.timeline.created"]>;
export type MatrizEventName = z.infer<typeof matrizEventNameSchema>;
export declare const navigationEntrySchema: z.ZodObject<{
    label: z.ZodString;
    path: z.ZodString;
    icon: z.ZodOptional<z.ZodString>;
    order: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    path: string;
    label: string;
    order: number;
    icon?: string | undefined;
}, {
    path: string;
    label: string;
    icon?: string | undefined;
    order?: number | undefined;
}>;
export type NavigationEntryDTO = z.infer<typeof navigationEntrySchema>;
export declare const appCapabilitySchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    description: string;
}, {
    name: string;
    id: string;
    description: string;
}>;
export type AppCapabilityDTO = z.infer<typeof appCapabilitySchema>;
export declare const appIntegrationSchema: z.ZodObject<{
    targetAppId: z.ZodEnum<["matriz-identity", "matriz-hub", "matriz-workbench", "sites", "spot", "seumei", "contracts", "willdash"]>;
    kind: z.ZodEnum<["gateway", "event-producer", "event-consumer", "external-link"]>;
    description: z.ZodString;
}, "strip", z.ZodTypeAny, {
    description: string;
    targetAppId: "matriz-identity" | "matriz-hub" | "matriz-workbench" | "sites" | "spot" | "seumei" | "contracts" | "willdash";
    kind: "gateway" | "event-producer" | "event-consumer" | "external-link";
}, {
    description: string;
    targetAppId: "matriz-identity" | "matriz-hub" | "matriz-workbench" | "sites" | "spot" | "seumei" | "contracts" | "willdash";
    kind: "gateway" | "event-producer" | "event-consumer" | "external-link";
}>;
export type AppIntegrationDTO = z.infer<typeof appIntegrationSchema>;
export declare const onboardingSupportSchema: z.ZodObject<{
    participates: z.ZodBoolean;
    hasSpecificStep: z.ZodBoolean;
    specificStepTitle: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    participates: boolean;
    hasSpecificStep: boolean;
    specificStepTitle?: string | undefined;
}, {
    participates: boolean;
    hasSpecificStep: boolean;
    specificStepTitle?: string | undefined;
}>;
export type OnboardingSupportDTO = z.infer<typeof onboardingSupportSchema>;
export declare const appManifestSchema: z.ZodObject<{
    appId: z.ZodEnum<["matriz-identity", "matriz-hub", "matriz-workbench", "sites", "spot", "seumei", "contracts", "willdash"]>;
    name: z.ZodString;
    description: z.ZodString;
    version: z.ZodString;
    contractVersion: z.ZodLiteral<"v1">;
    routes: z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        path: z.ZodString;
        icon: z.ZodOptional<z.ZodString>;
        order: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        path: string;
        label: string;
        order: number;
        icon?: string | undefined;
    }, {
        path: string;
        label: string;
        icon?: string | undefined;
        order?: number | undefined;
    }>, "many">;
    primaryRoute: z.ZodString;
    capabilities: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        description: string;
    }, {
        name: string;
        id: string;
        description: string;
    }>, "many">;
    eventsProduced: z.ZodArray<z.ZodEnum<["onboarding.completed", "spot.gig.created", "seumei.establishment.selected", "contract.created", "contract.linked", "hub.app.opened", "willdash.goal.opened", "willdash.activity.logged", "docs.document.created", "docs.document.imported", "docs.document.converted", "docs.document.version.created", "docs.document.version.published", "docs.document.deprecated", "docs.block.created", "docs.entity.created", "docs.entity.detected", "docs.relation.suggested", "docs.relation.approved", "docs.relation.rejected", "docs.suggestion.created", "docs.suggestion.accepted", "docs.suggestion.rejected", "docs.context.created", "docs.context.updated", "docs.context.published", "docs.mcp.read", "docs.mcp.refreshed", "docs.taskCandidate.created", "docs.governanceCandidate.created", "docs.export.generated", "docs.timeline.created"]>, "many">;
    eventsConsumed: z.ZodArray<z.ZodEnum<["onboarding.completed", "spot.gig.created", "seumei.establishment.selected", "contract.created", "contract.linked", "hub.app.opened", "willdash.goal.opened", "willdash.activity.logged", "docs.document.created", "docs.document.imported", "docs.document.converted", "docs.document.version.created", "docs.document.version.published", "docs.document.deprecated", "docs.block.created", "docs.entity.created", "docs.entity.detected", "docs.relation.suggested", "docs.relation.approved", "docs.relation.rejected", "docs.suggestion.created", "docs.suggestion.accepted", "docs.suggestion.rejected", "docs.context.created", "docs.context.updated", "docs.context.published", "docs.mcp.read", "docs.mcp.refreshed", "docs.taskCandidate.created", "docs.governanceCandidate.created", "docs.export.generated", "docs.timeline.created"]>, "many">;
    integrations: z.ZodArray<z.ZodObject<{
        targetAppId: z.ZodEnum<["matriz-identity", "matriz-hub", "matriz-workbench", "sites", "spot", "seumei", "contracts", "willdash"]>;
        kind: z.ZodEnum<["gateway", "event-producer", "event-consumer", "external-link"]>;
        description: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        description: string;
        targetAppId: "matriz-identity" | "matriz-hub" | "matriz-workbench" | "sites" | "spot" | "seumei" | "contracts" | "willdash";
        kind: "gateway" | "event-producer" | "event-consumer" | "external-link";
    }, {
        description: string;
        targetAppId: "matriz-identity" | "matriz-hub" | "matriz-workbench" | "sites" | "spot" | "seumei" | "contracts" | "willdash";
        kind: "gateway" | "event-producer" | "event-consumer" | "external-link";
    }>, "many">;
    onboardingSupport: z.ZodObject<{
        participates: z.ZodBoolean;
        hasSpecificStep: z.ZodBoolean;
        specificStepTitle: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        participates: boolean;
        hasSpecificStep: boolean;
        specificStepTitle?: string | undefined;
    }, {
        participates: boolean;
        hasSpecificStep: boolean;
        specificStepTitle?: string | undefined;
    }>;
    navigationEntry: z.ZodObject<{
        label: z.ZodString;
        path: z.ZodString;
        icon: z.ZodOptional<z.ZodString>;
        order: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        path: string;
        label: string;
        order: number;
        icon?: string | undefined;
    }, {
        path: string;
        label: string;
        icon?: string | undefined;
        order?: number | undefined;
    }>;
    ownership: z.ZodObject<{
        domainSummary: z.ZodString;
        maintainers: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        domainSummary: string;
        maintainers: string[];
    }, {
        domainSummary: string;
        maintainers?: string[] | undefined;
    }>;
    widgets: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        description: string;
    }, {
        name: string;
        id: string;
        description: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    appId: "matriz-identity" | "matriz-hub" | "matriz-workbench" | "sites" | "spot" | "seumei" | "contracts" | "willdash";
    capabilities: {
        name: string;
        id: string;
        description: string;
    }[];
    name: string;
    description: string;
    version: string;
    contractVersion: "v1";
    routes: {
        path: string;
        label: string;
        order: number;
        icon?: string | undefined;
    }[];
    primaryRoute: string;
    eventsProduced: ("onboarding.completed" | "spot.gig.created" | "seumei.establishment.selected" | "contract.created" | "contract.linked" | "hub.app.opened" | "willdash.goal.opened" | "willdash.activity.logged" | "docs.document.created" | "docs.document.imported" | "docs.document.converted" | "docs.document.version.created" | "docs.document.version.published" | "docs.document.deprecated" | "docs.block.created" | "docs.entity.created" | "docs.entity.detected" | "docs.relation.suggested" | "docs.relation.approved" | "docs.relation.rejected" | "docs.suggestion.created" | "docs.suggestion.accepted" | "docs.suggestion.rejected" | "docs.context.created" | "docs.context.updated" | "docs.context.published" | "docs.mcp.read" | "docs.mcp.refreshed" | "docs.taskCandidate.created" | "docs.governanceCandidate.created" | "docs.export.generated" | "docs.timeline.created")[];
    eventsConsumed: ("onboarding.completed" | "spot.gig.created" | "seumei.establishment.selected" | "contract.created" | "contract.linked" | "hub.app.opened" | "willdash.goal.opened" | "willdash.activity.logged" | "docs.document.created" | "docs.document.imported" | "docs.document.converted" | "docs.document.version.created" | "docs.document.version.published" | "docs.document.deprecated" | "docs.block.created" | "docs.entity.created" | "docs.entity.detected" | "docs.relation.suggested" | "docs.relation.approved" | "docs.relation.rejected" | "docs.suggestion.created" | "docs.suggestion.accepted" | "docs.suggestion.rejected" | "docs.context.created" | "docs.context.updated" | "docs.context.published" | "docs.mcp.read" | "docs.mcp.refreshed" | "docs.taskCandidate.created" | "docs.governanceCandidate.created" | "docs.export.generated" | "docs.timeline.created")[];
    integrations: {
        description: string;
        targetAppId: "matriz-identity" | "matriz-hub" | "matriz-workbench" | "sites" | "spot" | "seumei" | "contracts" | "willdash";
        kind: "gateway" | "event-producer" | "event-consumer" | "external-link";
    }[];
    onboardingSupport: {
        participates: boolean;
        hasSpecificStep: boolean;
        specificStepTitle?: string | undefined;
    };
    navigationEntry: {
        path: string;
        label: string;
        order: number;
        icon?: string | undefined;
    };
    ownership: {
        domainSummary: string;
        maintainers: string[];
    };
    widgets: {
        name: string;
        id: string;
        description: string;
    }[];
}, {
    appId: "matriz-identity" | "matriz-hub" | "matriz-workbench" | "sites" | "spot" | "seumei" | "contracts" | "willdash";
    capabilities: {
        name: string;
        id: string;
        description: string;
    }[];
    name: string;
    description: string;
    version: string;
    contractVersion: "v1";
    routes: {
        path: string;
        label: string;
        icon?: string | undefined;
        order?: number | undefined;
    }[];
    primaryRoute: string;
    eventsProduced: ("onboarding.completed" | "spot.gig.created" | "seumei.establishment.selected" | "contract.created" | "contract.linked" | "hub.app.opened" | "willdash.goal.opened" | "willdash.activity.logged" | "docs.document.created" | "docs.document.imported" | "docs.document.converted" | "docs.document.version.created" | "docs.document.version.published" | "docs.document.deprecated" | "docs.block.created" | "docs.entity.created" | "docs.entity.detected" | "docs.relation.suggested" | "docs.relation.approved" | "docs.relation.rejected" | "docs.suggestion.created" | "docs.suggestion.accepted" | "docs.suggestion.rejected" | "docs.context.created" | "docs.context.updated" | "docs.context.published" | "docs.mcp.read" | "docs.mcp.refreshed" | "docs.taskCandidate.created" | "docs.governanceCandidate.created" | "docs.export.generated" | "docs.timeline.created")[];
    eventsConsumed: ("onboarding.completed" | "spot.gig.created" | "seumei.establishment.selected" | "contract.created" | "contract.linked" | "hub.app.opened" | "willdash.goal.opened" | "willdash.activity.logged" | "docs.document.created" | "docs.document.imported" | "docs.document.converted" | "docs.document.version.created" | "docs.document.version.published" | "docs.document.deprecated" | "docs.block.created" | "docs.entity.created" | "docs.entity.detected" | "docs.relation.suggested" | "docs.relation.approved" | "docs.relation.rejected" | "docs.suggestion.created" | "docs.suggestion.accepted" | "docs.suggestion.rejected" | "docs.context.created" | "docs.context.updated" | "docs.context.published" | "docs.mcp.read" | "docs.mcp.refreshed" | "docs.taskCandidate.created" | "docs.governanceCandidate.created" | "docs.export.generated" | "docs.timeline.created")[];
    integrations: {
        description: string;
        targetAppId: "matriz-identity" | "matriz-hub" | "matriz-workbench" | "sites" | "spot" | "seumei" | "contracts" | "willdash";
        kind: "gateway" | "event-producer" | "event-consumer" | "external-link";
    }[];
    onboardingSupport: {
        participates: boolean;
        hasSpecificStep: boolean;
        specificStepTitle?: string | undefined;
    };
    navigationEntry: {
        path: string;
        label: string;
        icon?: string | undefined;
        order?: number | undefined;
    };
    ownership: {
        domainSummary: string;
        maintainers?: string[] | undefined;
    };
    widgets?: {
        name: string;
        id: string;
        description: string;
    }[] | undefined;
}>;
export type AppManifestDTO = z.infer<typeof appManifestSchema>;
export declare const registryEntrySchema: z.ZodObject<{
    appId: z.ZodEnum<["matriz-identity", "matriz-hub", "matriz-workbench", "sites", "spot", "seumei", "contracts", "willdash"]>;
    manifest: z.ZodObject<{
        appId: z.ZodEnum<["matriz-identity", "matriz-hub", "matriz-workbench", "sites", "spot", "seumei", "contracts", "willdash"]>;
        name: z.ZodString;
        description: z.ZodString;
        version: z.ZodString;
        contractVersion: z.ZodLiteral<"v1">;
        routes: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            path: z.ZodString;
            icon: z.ZodOptional<z.ZodString>;
            order: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            path: string;
            label: string;
            order: number;
            icon?: string | undefined;
        }, {
            path: string;
            label: string;
            icon?: string | undefined;
            order?: number | undefined;
        }>, "many">;
        primaryRoute: z.ZodString;
        capabilities: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            description: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            name: string;
            id: string;
            description: string;
        }, {
            name: string;
            id: string;
            description: string;
        }>, "many">;
        eventsProduced: z.ZodArray<z.ZodEnum<["onboarding.completed", "spot.gig.created", "seumei.establishment.selected", "contract.created", "contract.linked", "hub.app.opened", "willdash.goal.opened", "willdash.activity.logged", "docs.document.created", "docs.document.imported", "docs.document.converted", "docs.document.version.created", "docs.document.version.published", "docs.document.deprecated", "docs.block.created", "docs.entity.created", "docs.entity.detected", "docs.relation.suggested", "docs.relation.approved", "docs.relation.rejected", "docs.suggestion.created", "docs.suggestion.accepted", "docs.suggestion.rejected", "docs.context.created", "docs.context.updated", "docs.context.published", "docs.mcp.read", "docs.mcp.refreshed", "docs.taskCandidate.created", "docs.governanceCandidate.created", "docs.export.generated", "docs.timeline.created"]>, "many">;
        eventsConsumed: z.ZodArray<z.ZodEnum<["onboarding.completed", "spot.gig.created", "seumei.establishment.selected", "contract.created", "contract.linked", "hub.app.opened", "willdash.goal.opened", "willdash.activity.logged", "docs.document.created", "docs.document.imported", "docs.document.converted", "docs.document.version.created", "docs.document.version.published", "docs.document.deprecated", "docs.block.created", "docs.entity.created", "docs.entity.detected", "docs.relation.suggested", "docs.relation.approved", "docs.relation.rejected", "docs.suggestion.created", "docs.suggestion.accepted", "docs.suggestion.rejected", "docs.context.created", "docs.context.updated", "docs.context.published", "docs.mcp.read", "docs.mcp.refreshed", "docs.taskCandidate.created", "docs.governanceCandidate.created", "docs.export.generated", "docs.timeline.created"]>, "many">;
        integrations: z.ZodArray<z.ZodObject<{
            targetAppId: z.ZodEnum<["matriz-identity", "matriz-hub", "matriz-workbench", "sites", "spot", "seumei", "contracts", "willdash"]>;
            kind: z.ZodEnum<["gateway", "event-producer", "event-consumer", "external-link"]>;
            description: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            description: string;
            targetAppId: "matriz-identity" | "matriz-hub" | "matriz-workbench" | "sites" | "spot" | "seumei" | "contracts" | "willdash";
            kind: "gateway" | "event-producer" | "event-consumer" | "external-link";
        }, {
            description: string;
            targetAppId: "matriz-identity" | "matriz-hub" | "matriz-workbench" | "sites" | "spot" | "seumei" | "contracts" | "willdash";
            kind: "gateway" | "event-producer" | "event-consumer" | "external-link";
        }>, "many">;
        onboardingSupport: z.ZodObject<{
            participates: z.ZodBoolean;
            hasSpecificStep: z.ZodBoolean;
            specificStepTitle: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            participates: boolean;
            hasSpecificStep: boolean;
            specificStepTitle?: string | undefined;
        }, {
            participates: boolean;
            hasSpecificStep: boolean;
            specificStepTitle?: string | undefined;
        }>;
        navigationEntry: z.ZodObject<{
            label: z.ZodString;
            path: z.ZodString;
            icon: z.ZodOptional<z.ZodString>;
            order: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            path: string;
            label: string;
            order: number;
            icon?: string | undefined;
        }, {
            path: string;
            label: string;
            icon?: string | undefined;
            order?: number | undefined;
        }>;
        ownership: z.ZodObject<{
            domainSummary: z.ZodString;
            maintainers: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            domainSummary: string;
            maintainers: string[];
        }, {
            domainSummary: string;
            maintainers?: string[] | undefined;
        }>;
        widgets: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            description: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            name: string;
            id: string;
            description: string;
        }, {
            name: string;
            id: string;
            description: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        appId: "matriz-identity" | "matriz-hub" | "matriz-workbench" | "sites" | "spot" | "seumei" | "contracts" | "willdash";
        capabilities: {
            name: string;
            id: string;
            description: string;
        }[];
        name: string;
        description: string;
        version: string;
        contractVersion: "v1";
        routes: {
            path: string;
            label: string;
            order: number;
            icon?: string | undefined;
        }[];
        primaryRoute: string;
        eventsProduced: ("onboarding.completed" | "spot.gig.created" | "seumei.establishment.selected" | "contract.created" | "contract.linked" | "hub.app.opened" | "willdash.goal.opened" | "willdash.activity.logged" | "docs.document.created" | "docs.document.imported" | "docs.document.converted" | "docs.document.version.created" | "docs.document.version.published" | "docs.document.deprecated" | "docs.block.created" | "docs.entity.created" | "docs.entity.detected" | "docs.relation.suggested" | "docs.relation.approved" | "docs.relation.rejected" | "docs.suggestion.created" | "docs.suggestion.accepted" | "docs.suggestion.rejected" | "docs.context.created" | "docs.context.updated" | "docs.context.published" | "docs.mcp.read" | "docs.mcp.refreshed" | "docs.taskCandidate.created" | "docs.governanceCandidate.created" | "docs.export.generated" | "docs.timeline.created")[];
        eventsConsumed: ("onboarding.completed" | "spot.gig.created" | "seumei.establishment.selected" | "contract.created" | "contract.linked" | "hub.app.opened" | "willdash.goal.opened" | "willdash.activity.logged" | "docs.document.created" | "docs.document.imported" | "docs.document.converted" | "docs.document.version.created" | "docs.document.version.published" | "docs.document.deprecated" | "docs.block.created" | "docs.entity.created" | "docs.entity.detected" | "docs.relation.suggested" | "docs.relation.approved" | "docs.relation.rejected" | "docs.suggestion.created" | "docs.suggestion.accepted" | "docs.suggestion.rejected" | "docs.context.created" | "docs.context.updated" | "docs.context.published" | "docs.mcp.read" | "docs.mcp.refreshed" | "docs.taskCandidate.created" | "docs.governanceCandidate.created" | "docs.export.generated" | "docs.timeline.created")[];
        integrations: {
            description: string;
            targetAppId: "matriz-identity" | "matriz-hub" | "matriz-workbench" | "sites" | "spot" | "seumei" | "contracts" | "willdash";
            kind: "gateway" | "event-producer" | "event-consumer" | "external-link";
        }[];
        onboardingSupport: {
            participates: boolean;
            hasSpecificStep: boolean;
            specificStepTitle?: string | undefined;
        };
        navigationEntry: {
            path: string;
            label: string;
            order: number;
            icon?: string | undefined;
        };
        ownership: {
            domainSummary: string;
            maintainers: string[];
        };
        widgets: {
            name: string;
            id: string;
            description: string;
        }[];
    }, {
        appId: "matriz-identity" | "matriz-hub" | "matriz-workbench" | "sites" | "spot" | "seumei" | "contracts" | "willdash";
        capabilities: {
            name: string;
            id: string;
            description: string;
        }[];
        name: string;
        description: string;
        version: string;
        contractVersion: "v1";
        routes: {
            path: string;
            label: string;
            icon?: string | undefined;
            order?: number | undefined;
        }[];
        primaryRoute: string;
        eventsProduced: ("onboarding.completed" | "spot.gig.created" | "seumei.establishment.selected" | "contract.created" | "contract.linked" | "hub.app.opened" | "willdash.goal.opened" | "willdash.activity.logged" | "docs.document.created" | "docs.document.imported" | "docs.document.converted" | "docs.document.version.created" | "docs.document.version.published" | "docs.document.deprecated" | "docs.block.created" | "docs.entity.created" | "docs.entity.detected" | "docs.relation.suggested" | "docs.relation.approved" | "docs.relation.rejected" | "docs.suggestion.created" | "docs.suggestion.accepted" | "docs.suggestion.rejected" | "docs.context.created" | "docs.context.updated" | "docs.context.published" | "docs.mcp.read" | "docs.mcp.refreshed" | "docs.taskCandidate.created" | "docs.governanceCandidate.created" | "docs.export.generated" | "docs.timeline.created")[];
        eventsConsumed: ("onboarding.completed" | "spot.gig.created" | "seumei.establishment.selected" | "contract.created" | "contract.linked" | "hub.app.opened" | "willdash.goal.opened" | "willdash.activity.logged" | "docs.document.created" | "docs.document.imported" | "docs.document.converted" | "docs.document.version.created" | "docs.document.version.published" | "docs.document.deprecated" | "docs.block.created" | "docs.entity.created" | "docs.entity.detected" | "docs.relation.suggested" | "docs.relation.approved" | "docs.relation.rejected" | "docs.suggestion.created" | "docs.suggestion.accepted" | "docs.suggestion.rejected" | "docs.context.created" | "docs.context.updated" | "docs.context.published" | "docs.mcp.read" | "docs.mcp.refreshed" | "docs.taskCandidate.created" | "docs.governanceCandidate.created" | "docs.export.generated" | "docs.timeline.created")[];
        integrations: {
            description: string;
            targetAppId: "matriz-identity" | "matriz-hub" | "matriz-workbench" | "sites" | "spot" | "seumei" | "contracts" | "willdash";
            kind: "gateway" | "event-producer" | "event-consumer" | "external-link";
        }[];
        onboardingSupport: {
            participates: boolean;
            hasSpecificStep: boolean;
            specificStepTitle?: string | undefined;
        };
        navigationEntry: {
            path: string;
            label: string;
            icon?: string | undefined;
            order?: number | undefined;
        };
        ownership: {
            domainSummary: string;
            maintainers?: string[] | undefined;
        };
        widgets?: {
            name: string;
            id: string;
            description: string;
        }[] | undefined;
    }>;
    baseUrl: z.ZodString;
    enabled: z.ZodBoolean;
    registeredAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    appId: "matriz-identity" | "matriz-hub" | "matriz-workbench" | "sites" | "spot" | "seumei" | "contracts" | "willdash";
    enabled: boolean;
    manifest: {
        appId: "matriz-identity" | "matriz-hub" | "matriz-workbench" | "sites" | "spot" | "seumei" | "contracts" | "willdash";
        capabilities: {
            name: string;
            id: string;
            description: string;
        }[];
        name: string;
        description: string;
        version: string;
        contractVersion: "v1";
        routes: {
            path: string;
            label: string;
            order: number;
            icon?: string | undefined;
        }[];
        primaryRoute: string;
        eventsProduced: ("onboarding.completed" | "spot.gig.created" | "seumei.establishment.selected" | "contract.created" | "contract.linked" | "hub.app.opened" | "willdash.goal.opened" | "willdash.activity.logged" | "docs.document.created" | "docs.document.imported" | "docs.document.converted" | "docs.document.version.created" | "docs.document.version.published" | "docs.document.deprecated" | "docs.block.created" | "docs.entity.created" | "docs.entity.detected" | "docs.relation.suggested" | "docs.relation.approved" | "docs.relation.rejected" | "docs.suggestion.created" | "docs.suggestion.accepted" | "docs.suggestion.rejected" | "docs.context.created" | "docs.context.updated" | "docs.context.published" | "docs.mcp.read" | "docs.mcp.refreshed" | "docs.taskCandidate.created" | "docs.governanceCandidate.created" | "docs.export.generated" | "docs.timeline.created")[];
        eventsConsumed: ("onboarding.completed" | "spot.gig.created" | "seumei.establishment.selected" | "contract.created" | "contract.linked" | "hub.app.opened" | "willdash.goal.opened" | "willdash.activity.logged" | "docs.document.created" | "docs.document.imported" | "docs.document.converted" | "docs.document.version.created" | "docs.document.version.published" | "docs.document.deprecated" | "docs.block.created" | "docs.entity.created" | "docs.entity.detected" | "docs.relation.suggested" | "docs.relation.approved" | "docs.relation.rejected" | "docs.suggestion.created" | "docs.suggestion.accepted" | "docs.suggestion.rejected" | "docs.context.created" | "docs.context.updated" | "docs.context.published" | "docs.mcp.read" | "docs.mcp.refreshed" | "docs.taskCandidate.created" | "docs.governanceCandidate.created" | "docs.export.generated" | "docs.timeline.created")[];
        integrations: {
            description: string;
            targetAppId: "matriz-identity" | "matriz-hub" | "matriz-workbench" | "sites" | "spot" | "seumei" | "contracts" | "willdash";
            kind: "gateway" | "event-producer" | "event-consumer" | "external-link";
        }[];
        onboardingSupport: {
            participates: boolean;
            hasSpecificStep: boolean;
            specificStepTitle?: string | undefined;
        };
        navigationEntry: {
            path: string;
            label: string;
            order: number;
            icon?: string | undefined;
        };
        ownership: {
            domainSummary: string;
            maintainers: string[];
        };
        widgets: {
            name: string;
            id: string;
            description: string;
        }[];
    };
    baseUrl: string;
    registeredAt: string;
}, {
    appId: "matriz-identity" | "matriz-hub" | "matriz-workbench" | "sites" | "spot" | "seumei" | "contracts" | "willdash";
    enabled: boolean;
    manifest: {
        appId: "matriz-identity" | "matriz-hub" | "matriz-workbench" | "sites" | "spot" | "seumei" | "contracts" | "willdash";
        capabilities: {
            name: string;
            id: string;
            description: string;
        }[];
        name: string;
        description: string;
        version: string;
        contractVersion: "v1";
        routes: {
            path: string;
            label: string;
            icon?: string | undefined;
            order?: number | undefined;
        }[];
        primaryRoute: string;
        eventsProduced: ("onboarding.completed" | "spot.gig.created" | "seumei.establishment.selected" | "contract.created" | "contract.linked" | "hub.app.opened" | "willdash.goal.opened" | "willdash.activity.logged" | "docs.document.created" | "docs.document.imported" | "docs.document.converted" | "docs.document.version.created" | "docs.document.version.published" | "docs.document.deprecated" | "docs.block.created" | "docs.entity.created" | "docs.entity.detected" | "docs.relation.suggested" | "docs.relation.approved" | "docs.relation.rejected" | "docs.suggestion.created" | "docs.suggestion.accepted" | "docs.suggestion.rejected" | "docs.context.created" | "docs.context.updated" | "docs.context.published" | "docs.mcp.read" | "docs.mcp.refreshed" | "docs.taskCandidate.created" | "docs.governanceCandidate.created" | "docs.export.generated" | "docs.timeline.created")[];
        eventsConsumed: ("onboarding.completed" | "spot.gig.created" | "seumei.establishment.selected" | "contract.created" | "contract.linked" | "hub.app.opened" | "willdash.goal.opened" | "willdash.activity.logged" | "docs.document.created" | "docs.document.imported" | "docs.document.converted" | "docs.document.version.created" | "docs.document.version.published" | "docs.document.deprecated" | "docs.block.created" | "docs.entity.created" | "docs.entity.detected" | "docs.relation.suggested" | "docs.relation.approved" | "docs.relation.rejected" | "docs.suggestion.created" | "docs.suggestion.accepted" | "docs.suggestion.rejected" | "docs.context.created" | "docs.context.updated" | "docs.context.published" | "docs.mcp.read" | "docs.mcp.refreshed" | "docs.taskCandidate.created" | "docs.governanceCandidate.created" | "docs.export.generated" | "docs.timeline.created")[];
        integrations: {
            description: string;
            targetAppId: "matriz-identity" | "matriz-hub" | "matriz-workbench" | "sites" | "spot" | "seumei" | "contracts" | "willdash";
            kind: "gateway" | "event-producer" | "event-consumer" | "external-link";
        }[];
        onboardingSupport: {
            participates: boolean;
            hasSpecificStep: boolean;
            specificStepTitle?: string | undefined;
        };
        navigationEntry: {
            path: string;
            label: string;
            icon?: string | undefined;
            order?: number | undefined;
        };
        ownership: {
            domainSummary: string;
            maintainers?: string[] | undefined;
        };
        widgets?: {
            name: string;
            id: string;
            description: string;
        }[] | undefined;
    };
    baseUrl: string;
    registeredAt: string;
}>;
export type RegistryEntryDTO = z.infer<typeof registryEntrySchema>;
export declare const sharedAppNavigationSchema: z.ZodObject<{
    appId: z.ZodEnum<["matriz-identity", "matriz-hub", "matriz-workbench", "sites", "spot", "seumei", "contracts", "willdash"]>;
    label: z.ZodString;
    primaryRoute: z.ZodString;
    baseUrl: z.ZodString;
    routes: z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        path: z.ZodString;
        icon: z.ZodOptional<z.ZodString>;
        order: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        path: string;
        label: string;
        order: number;
        icon?: string | undefined;
    }, {
        path: string;
        label: string;
        icon?: string | undefined;
        order?: number | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    appId: "matriz-identity" | "matriz-hub" | "matriz-workbench" | "sites" | "spot" | "seumei" | "contracts" | "willdash";
    label: string;
    routes: {
        path: string;
        label: string;
        order: number;
        icon?: string | undefined;
    }[];
    primaryRoute: string;
    baseUrl: string;
}, {
    appId: "matriz-identity" | "matriz-hub" | "matriz-workbench" | "sites" | "spot" | "seumei" | "contracts" | "willdash";
    label: string;
    routes: {
        path: string;
        label: string;
        icon?: string | undefined;
        order?: number | undefined;
    }[];
    primaryRoute: string;
    baseUrl: string;
}>;
export type SharedAppNavigationDTO = z.infer<typeof sharedAppNavigationSchema>;
//# sourceMappingURL=manifest.d.ts.map