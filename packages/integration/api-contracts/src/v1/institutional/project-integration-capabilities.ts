/**
 * ProjectIntegrationCapabilities (v1, institutional).
 *
 * O que o projeto oferece/consome como superficie institucional.
 * Nao confundir com AppCapabilityDTO (tecnico, interno ao manifest do app).
 * Este e o mapa macro de integracao institucional. Domain-free.
 */
import { z } from "zod"

export const INTEGRATION_KIND_VALUES = ["event", "dto", "link", "webhook"] as const
export const integrationKindSchema = z.enum(INTEGRATION_KIND_VALUES)
export type IntegrationKind = z.infer<typeof integrationKindSchema>

export const EXPOSURE_KIND_VALUES = [
  "page",
  "api",
  "mcp-tool",
  "widget",
  "feed",
] as const
export const exposureKindSchema = z.enum(EXPOSURE_KIND_VALUES)
export type ExposureKind = z.infer<typeof exposureKindSchema>

export const REQUIREMENT_KIND_VALUES = [
  "auth",
  "tenant",
  "permission",
  "flag",
] as const
export const requirementKindSchema = z.enum(REQUIREMENT_KIND_VALUES)
export type RequirementKind = z.infer<typeof requirementKindSchema>

export const integrationPointSchema = z.object({
  kind: integrationKindSchema,
  name: z.string().min(1),
  version: z.string().optional(),
})
export type IntegrationPoint = z.infer<typeof integrationPointSchema>

export const exposurePointSchema = z.object({
  kind: exposureKindSchema,
  name: z.string().min(1),
  path: z.string().optional(),
})
export type ExposurePoint = z.infer<typeof exposurePointSchema>

export const requirementPointSchema = z.object({
  kind: requirementKindSchema,
  name: z.string().min(1),
})
export type RequirementPoint = z.infer<typeof requirementPointSchema>

export const projectIntegrationCapabilitiesSchema = z.object({
  produces: z.array(integrationPointSchema).default([]),
  consumes: z.array(integrationPointSchema).default([]),
  exposes: z.array(exposurePointSchema).default([]),
  requires: z.array(requirementPointSchema).default([]),
})
export type ProjectIntegrationCapabilities = z.infer<
  typeof projectIntegrationCapabilitiesSchema
>
