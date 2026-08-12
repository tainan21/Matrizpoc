/**
 * GigSummaryDTO + EstablishmentSummaryDTO + ContractSummaryDTO (v1).
 *
 * Contratos publicos, deliberadamente "rasos". O modelo interno de Spot/Seumei/
 * Contracts nao vaza pra ca (L12). Esse DTO e o unico shape cross-app sobre
 * essas entidades.
 */
import { z } from "zod";
import { appIdSchema } from "./manifest";
export const gigSummarySchema = z.object({
    id: z.string().min(1),
    tenantId: z.string().min(1),
    title: z.string().min(1),
    venueName: z.string().min(1),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    bandName: z.string().min(1),
    feeAmount: z.number().nonnegative(),
    currency: z.string().length(3),
});
export const establishmentSummarySchema = z.object({
    id: z.string().min(1),
    tenantId: z.string().min(1),
    name: z.string().min(1),
    type: z.string().min(1),
    address: z.string().min(1),
    ownerName: z.string().min(1),
    serviceRadiusKm: z.number().nonnegative(),
});
export const contractSummarySchema = z.object({
    id: z.string().min(1),
    tenantId: z.string().min(1),
    title: z.string().min(1),
    status: z.enum(["draft", "active", "completed", "cancelled"]),
    originApp: appIdSchema,
    createdAt: z.string().datetime(),
    parties: z
        .array(z.object({
        name: z.string().min(1),
        role: z.string().min(1),
    }))
        .min(1),
});
//# sourceMappingURL=summaries.js.map