/**
 * TelemetryEventDTO (v1) — envelope publico. Implementacao do motor vive em
 * packages/platform/telemetry. Aqui so declaramos a superficie do contrato.
 */
import { z } from "zod";
export declare const telemetryEventSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodLiteral<"v1">;
    appId: z.ZodEnum<["matriz-identity", "matriz-hub", "matriz-workbench", "sites", "spot", "seumei", "contracts", "willdash"]>;
    tenantId: z.ZodString;
    name: z.ZodString;
    occurredAt: z.ZodString;
    properties: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    appId: "matriz-identity" | "matriz-hub" | "matriz-workbench" | "sites" | "spot" | "seumei" | "contracts" | "willdash";
    name: string;
    id: string;
    version: "v1";
    occurredAt: string;
    properties: Record<string, unknown>;
}, {
    tenantId: string;
    appId: "matriz-identity" | "matriz-hub" | "matriz-workbench" | "sites" | "spot" | "seumei" | "contracts" | "willdash";
    name: string;
    id: string;
    version: "v1";
    occurredAt: string;
    properties?: Record<string, unknown> | undefined;
}>;
export type TelemetryEventDTO = z.infer<typeof telemetryEventSchema>;
//# sourceMappingURL=telemetry.d.ts.map