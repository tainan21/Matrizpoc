/**
 * ProjectMcpCapabilities (v1, institutional).
 *
 * Scaffold tipado e DECLARATIVO de capabilities MCP (Model Context Protocol).
 *
 * IMPORTANTE (V1.2): Este e um contract real (Zod + TS), mas nao ha servidor
 * MCP funcional ainda. O campo `status` deixa explicito se a capability e
 * declarada (apenas metadata), stub (interface existente) ou available
 * (servidor real respondendo).
 *
 * Ver docs/mcp-capabilities-model.md.
 */
import { z } from "zod"

export const MCP_STATUS_VALUES = ["declared", "stub", "available"] as const
export const mcpStatusSchema = z.enum(MCP_STATUS_VALUES)
export type McpStatus = z.infer<typeof mcpStatusSchema>

export const mcpToolSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  inputSchemaRef: z.string().optional(),
})
export type McpTool = z.infer<typeof mcpToolSchema>

export const mcpResourceSchema = z.object({
  uriTemplate: z.string().min(1),
  description: z.string().optional(),
})
export type McpResource = z.infer<typeof mcpResourceSchema>

export const mcpPromptSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
})
export type McpPrompt = z.infer<typeof mcpPromptSchema>

export const projectMcpCapabilitiesSchema = z.object({
  serverName: z.string().optional(),
  tools: z.array(mcpToolSchema).default([]),
  resources: z.array(mcpResourceSchema).default([]),
  prompts: z.array(mcpPromptSchema).default([]),
  status: mcpStatusSchema.default("declared"),
})
export type ProjectMcpCapabilities = z.infer<typeof projectMcpCapabilitiesSchema>
