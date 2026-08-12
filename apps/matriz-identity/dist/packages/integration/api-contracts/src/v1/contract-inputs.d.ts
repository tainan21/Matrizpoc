/**
 * CreateContractInput + CreateContractFromGigInput + CreateContractFromEstablishmentInput (v1).
 *
 * Inputs publicos consumidos pelo app Contracts. Origem vinda de Spot ou Seumei
 * chega sempre via DTO, nunca via import de internals do app de origem (L3).
 */
import { z } from "zod";
export declare const contractPartyInputSchema: z.ZodObject<{
    name: z.ZodString;
    role: z.ZodString;
    email: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    role: string;
    email?: string | undefined;
}, {
    name: string;
    role: string;
    email?: string | undefined;
}>;
export type ContractPartyInputDTO = z.infer<typeof contractPartyInputSchema>;
export declare const createContractInputSchema: z.ZodObject<{
    tenantId: z.ZodString;
    title: z.ZodString;
    originApp: z.ZodEnum<["matriz-identity", "matriz-hub", "matriz-workbench", "sites", "spot", "seumei", "contracts", "willdash"]>;
    parties: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        role: z.ZodString;
        email: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        role: string;
        email?: string | undefined;
    }, {
        name: string;
        role: string;
        email?: string | undefined;
    }>, "many">;
    templateId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    title: string;
    originApp: "matriz-identity" | "matriz-hub" | "matriz-workbench" | "sites" | "spot" | "seumei" | "contracts" | "willdash";
    parties: {
        name: string;
        role: string;
        email?: string | undefined;
    }[];
    metadata: Record<string, unknown>;
    templateId?: string | undefined;
}, {
    tenantId: string;
    title: string;
    originApp: "matriz-identity" | "matriz-hub" | "matriz-workbench" | "sites" | "spot" | "seumei" | "contracts" | "willdash";
    parties: {
        name: string;
        role: string;
        email?: string | undefined;
    }[];
    templateId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type CreateContractInput = z.infer<typeof createContractInputSchema>;
export declare const createContractFromGigInputSchema: z.ZodObject<{
    tenantId: z.ZodString;
    gig: z.ZodObject<{
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
    counterpartyName: z.ZodString;
    counterpartyRole: z.ZodDefault<z.ZodString>;
    templateId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    gig: {
        tenantId: string;
        id: string;
        title: string;
        venueName: string;
        startsAt: string;
        endsAt: string;
        bandName: string;
        feeAmount: number;
        currency: string;
    };
    counterpartyName: string;
    counterpartyRole: string;
    templateId?: string | undefined;
}, {
    tenantId: string;
    gig: {
        tenantId: string;
        id: string;
        title: string;
        venueName: string;
        startsAt: string;
        endsAt: string;
        bandName: string;
        feeAmount: number;
        currency: string;
    };
    counterpartyName: string;
    templateId?: string | undefined;
    counterpartyRole?: string | undefined;
}>;
export type CreateContractFromGigInput = z.infer<typeof createContractFromGigInputSchema>;
export declare const createContractFromEstablishmentInputSchema: z.ZodObject<{
    tenantId: z.ZodString;
    establishment: z.ZodObject<{
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
    counterpartyName: z.ZodString;
    counterpartyRole: z.ZodDefault<z.ZodString>;
    serviceDescription: z.ZodString;
    templateId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    counterpartyName: string;
    counterpartyRole: string;
    establishment: {
        tenantId: string;
        name: string;
        id: string;
        type: string;
        address: string;
        ownerName: string;
        serviceRadiusKm: number;
    };
    serviceDescription: string;
    templateId?: string | undefined;
}, {
    tenantId: string;
    counterpartyName: string;
    establishment: {
        tenantId: string;
        name: string;
        id: string;
        type: string;
        address: string;
        ownerName: string;
        serviceRadiusKm: number;
    };
    serviceDescription: string;
    templateId?: string | undefined;
    counterpartyRole?: string | undefined;
}>;
export type CreateContractFromEstablishmentInput = z.infer<typeof createContractFromEstablishmentInputSchema>;
//# sourceMappingURL=contract-inputs.d.ts.map