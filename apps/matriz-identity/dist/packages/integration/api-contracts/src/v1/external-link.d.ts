/**
 * ExternalLinkDTO (v1).
 *
 * Um registro em Contracts pode referenciar gig do Spot, establishment
 * da Seumei ou tenant do Core. O shape segue o escopo literalmente.
 */
import { z } from "zod";
export declare const externalLinkRelationTypeSchema: z.ZodEnum<["contract.source", "contract.reference", "contract.party", "tenant.ownership", "manifest.declared"]>;
export type ExternalLinkRelationType = z.infer<typeof externalLinkRelationTypeSchema>;
export declare const externalLinkSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    localApp: z.ZodEnum<["matriz-identity", "matriz-hub", "matriz-workbench", "sites", "spot", "seumei", "contracts", "willdash"]>;
    localEntityType: z.ZodString;
    localEntityId: z.ZodString;
    externalApp: z.ZodEnum<["matriz-identity", "matriz-hub", "matriz-workbench", "sites", "spot", "seumei", "contracts", "willdash"]>;
    externalEntityType: z.ZodString;
    externalEntityId: z.ZodString;
    relationType: z.ZodEnum<["contract.source", "contract.reference", "contract.party", "tenant.ownership", "manifest.declared"]>;
    snapshot: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    id: string;
    createdAt: string;
    localApp: "matriz-identity" | "matriz-hub" | "matriz-workbench" | "sites" | "spot" | "seumei" | "contracts" | "willdash";
    localEntityType: string;
    localEntityId: string;
    externalApp: "matriz-identity" | "matriz-hub" | "matriz-workbench" | "sites" | "spot" | "seumei" | "contracts" | "willdash";
    externalEntityType: string;
    externalEntityId: string;
    relationType: "contract.source" | "contract.reference" | "contract.party" | "tenant.ownership" | "manifest.declared";
    snapshot: Record<string, unknown>;
}, {
    tenantId: string;
    id: string;
    createdAt: string;
    localApp: "matriz-identity" | "matriz-hub" | "matriz-workbench" | "sites" | "spot" | "seumei" | "contracts" | "willdash";
    localEntityType: string;
    localEntityId: string;
    externalApp: "matriz-identity" | "matriz-hub" | "matriz-workbench" | "sites" | "spot" | "seumei" | "contracts" | "willdash";
    externalEntityType: string;
    externalEntityId: string;
    relationType: "contract.source" | "contract.reference" | "contract.party" | "tenant.ownership" | "manifest.declared";
    snapshot?: Record<string, unknown> | undefined;
}>;
export type ExternalLinkDTO = z.infer<typeof externalLinkSchema>;
//# sourceMappingURL=external-link.d.ts.map