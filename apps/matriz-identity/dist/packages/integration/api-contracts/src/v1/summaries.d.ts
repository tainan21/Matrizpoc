/**
 * GigSummaryDTO + EstablishmentSummaryDTO + ContractSummaryDTO (v1).
 *
 * Contratos publicos, deliberadamente "rasos". O modelo interno de Spot/Seumei/
 * Contracts nao vaza pra ca (L12). Esse DTO e o unico shape cross-app sobre
 * essas entidades.
 */
import { z } from "zod";
export declare const gigSummarySchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    title: z.ZodString;
    venueName: z.ZodString;
    startsAt: z.ZodString;
    endsAt: z.ZodString;
    bandName: z.ZodString;
    feeAmount: z.ZodNumber;
    currency: z.ZodString;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    id: string;
    title: string;
    venueName: string;
    startsAt: string;
    endsAt: string;
    bandName: string;
    feeAmount: number;
    currency: string;
}, {
    tenantId: string;
    id: string;
    title: string;
    venueName: string;
    startsAt: string;
    endsAt: string;
    bandName: string;
    feeAmount: number;
    currency: string;
}>;
export type GigSummaryDTO = z.infer<typeof gigSummarySchema>;
export declare const establishmentSummarySchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    name: z.ZodString;
    type: z.ZodString;
    address: z.ZodString;
    ownerName: z.ZodString;
    serviceRadiusKm: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    name: string;
    id: string;
    type: string;
    address: string;
    ownerName: string;
    serviceRadiusKm: number;
}, {
    tenantId: string;
    name: string;
    id: string;
    type: string;
    address: string;
    ownerName: string;
    serviceRadiusKm: number;
}>;
export type EstablishmentSummaryDTO = z.infer<typeof establishmentSummarySchema>;
export declare const contractSummarySchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    title: z.ZodString;
    status: z.ZodEnum<["draft", "active", "completed", "cancelled"]>;
    originApp: z.ZodEnum<["matriz-identity", "matriz-hub", "matriz-workbench", "sites", "spot", "seumei", "contracts", "willdash"]>;
    createdAt: z.ZodString;
    parties: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        role: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        role: string;
    }, {
        name: string;
        role: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    id: string;
    createdAt: string;
    status: "draft" | "active" | "completed" | "cancelled";
    title: string;
    originApp: "matriz-identity" | "matriz-hub" | "matriz-workbench" | "sites" | "spot" | "seumei" | "contracts" | "willdash";
    parties: {
        name: string;
        role: string;
    }[];
}, {
    tenantId: string;
    id: string;
    createdAt: string;
    status: "draft" | "active" | "completed" | "cancelled";
    title: string;
    originApp: "matriz-identity" | "matriz-hub" | "matriz-workbench" | "sites" | "spot" | "seumei" | "contracts" | "willdash";
    parties: {
        name: string;
        role: string;
    }[];
}>;
export type ContractSummaryDTO = z.infer<typeof contractSummarySchema>;
//# sourceMappingURL=summaries.d.ts.map