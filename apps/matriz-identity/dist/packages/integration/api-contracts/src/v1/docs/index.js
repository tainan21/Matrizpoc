/**
 * MatrizDocs v1 public DTOs.
 *
 * These contracts are intentionally data-shape only. Domain rules stay inside
 * apps/matriz-hub/src/domains/docs; other apps consume this package to read or
 * emit public surfaces without importing Hub internals.
 */
import { z } from "zod";
const jsonRecordSchema = z.record(z.string(), z.unknown());
const isoDateSchema = z.string().datetime();
export const docActorTypeSchema = z.enum([
    "human_user",
    "mcp_server",
    "ai_agent",
    "worker",
    "scheduler",
    "system",
    "external_source",
]);
export const docActorSchema = z.object({
    actorId: z.string().min(1),
    actorType: docActorTypeSchema,
    displayName: z.string().optional(),
});
export const docDocumentStatusSchema = z.enum([
    "raw",
    "draft",
    "structured",
    "in_review",
    "approved",
    "published",
    "deprecated",
    "superseded",
    "archived",
]);
export const docDocumentTypeSchema = z.enum([
    "institutional",
    "technical",
    "governance",
    "financial",
    "equity",
    "onboarding",
    "invite",
    "tutorial",
    "contract",
    "meeting_note",
    "proposal",
    "prompt",
    "requirement",
    "research",
    "report",
    "mcp_context",
    "public_copy",
    "internal_policy",
]);
export const docVisibilitySchema = z.enum(["private", "internal", "restricted", "public"]);
export const docSensitivitySchema = z.enum(["normal", "sensitive", "financial", "legal", "equity"]);
export const docBlockTypeSchema = z.enum([
    "heading",
    "paragraph",
    "list",
    "table",
    "definition",
    "decision",
    "rule",
    "requirement",
    "risk",
    "question",
    "answer",
    "quote",
    "sensitive_note",
    "task_candidate",
    "governance_candidate",
    "mcp_context",
    "timeline_note",
    "external_reference",
]);
export const docSuggestionTypeSchema = z.enum([
    "entity",
    "relation",
    "task",
    "governance",
    "document_patch",
    "context_update",
    "export_refresh",
    "mcp_refresh",
    "duplicate",
    "contradiction",
    "deprecation",
]);
export const docSuggestionStatusSchema = z.enum([
    "suggested",
    "accepted",
    "edited",
    "rejected",
    "archived",
    "applied",
    "superseded",
]);
export const knowledgeRelationTypeSchema = z.enum([
    "mentions",
    "explains",
    "belongs_to",
    "depends_on",
    "affects",
    "replaces",
    "contradicts",
    "generates",
    "requires_review",
    "feeds",
    "is_used_by",
    "blocks",
    "approves",
    "derived_from",
]);
export const documentSummarySchema = z.object({
    id: z.string().min(1),
    tenantId: z.string().min(1),
    projectId: z.string().optional(),
    title: z.string().min(1),
    slug: z.string().min(1),
    description: z.string().optional(),
    type: docDocumentTypeSchema,
    status: docDocumentStatusSchema,
    visibility: docVisibilitySchema,
    sensitivity: docSensitivitySchema,
    currentVersionId: z.string().nullable(),
    currentVersionNumber: z.number().int().positive().optional(),
    summary: z.string().optional(),
    createdAt: isoDateSchema,
    updatedAt: isoDateSchema,
    badges: z.array(z.string()).default([]),
    counters: z
        .object({
        blocks: z.number().int().nonnegative(),
        suggestions: z.number().int().nonnegative(),
        relations: z.number().int().nonnegative(),
        contextPackages: z.number().int().nonnegative(),
    })
        .optional(),
});
export const documentVersionSchema = z.object({
    id: z.string().min(1),
    tenantId: z.string().min(1),
    documentId: z.string().min(1),
    versionNumber: z.number().int().positive(),
    status: z.string().min(1),
    titleSnapshot: z.string().min(1),
    contentHash: z.string().min(1),
    summary: z.string().nullable(),
    aiSummary: z.string().nullable(),
    changeReason: z.string().nullable(),
    createdByActorId: z.string().min(1),
    createdByActorType: docActorTypeSchema,
    publishedAt: isoDateSchema.nullable(),
    deprecatedAt: isoDateSchema.nullable(),
    createdAt: isoDateSchema,
});
export const documentBlockSchema = z.object({
    id: z.string().min(1),
    tenantId: z.string().min(1),
    documentId: z.string().min(1),
    versionId: z.string().min(1),
    parentBlockId: z.string().nullable(),
    order: z.number().int().nonnegative(),
    type: docBlockTypeSchema,
    content: jsonRecordSchema,
    plainText: z.string(),
    sensitivity: docSensitivitySchema,
    metadata: jsonRecordSchema.nullable(),
});
export const knowledgeNodeSchema = z.object({
    id: z.string().min(1),
    tenantId: z.string().min(1),
    type: z.string().min(1),
    name: z.string().min(1),
    slug: z.string().min(1),
    description: z.string().nullable(),
    canonicalRefType: z.string().nullable(),
    canonicalRefId: z.string().nullable(),
});
export const knowledgeEdgeSchema = z.object({
    id: z.string().min(1),
    tenantId: z.string().min(1),
    sourceNodeId: z.string().min(1),
    targetNodeId: z.string().min(1),
    relationType: knowledgeRelationTypeSchema,
    status: z.enum(["suggested", "approved", "rejected"]),
    confidence: z.number().min(0).max(1).nullable(),
    evidence: jsonRecordSchema,
    createdByActorId: z.string().min(1),
    approvedByActorId: z.string().nullable(),
});
export const suggestionSchema = z.object({
    id: z.string().min(1),
    tenantId: z.string().min(1),
    type: docSuggestionTypeSchema,
    status: docSuggestionStatusSchema,
    title: z.string().min(1),
    description: z.string().min(1),
    confidence: z.number().min(0).max(1).nullable(),
    evidence: jsonRecordSchema,
    targetType: z.string().min(1),
    targetId: z.string().min(1),
    createdByActorId: z.string().min(1),
    reviewedByActorId: z.string().nullable(),
    result: jsonRecordSchema.nullable(),
    createdAt: isoDateSchema,
    updatedAt: isoDateSchema,
});
export const contextPackageItemSchema = z.object({
    id: z.string().min(1),
    documentId: z.string().min(1),
    versionId: z.string().nullable(),
    blockId: z.string().nullable(),
    order: z.number().int().nonnegative(),
    required: z.boolean(),
    label: z.string().nullable(),
});
export const contextPackageSchema = z.object({
    id: z.string().min(1),
    tenantId: z.string().min(1),
    slug: z.string().min(1),
    title: z.string().min(1),
    description: z.string().nullable(),
    audience: z.string().min(1),
    status: z.enum(["draft", "published", "outdated", "archived"]),
    visibility: docVisibilitySchema,
    version: z.number().int().positive(),
    summary: z.string().nullable(),
    mcpUri: z.string().nullable(),
    lastPublishedAt: isoDateSchema.nullable(),
    items: z.array(contextPackageItemSchema).default([]),
    createdAt: isoDateSchema,
    updatedAt: isoDateSchema,
});
export const timelineEventSchema = z.object({
    id: z.string().min(1),
    tenantId: z.string().min(1),
    name: z.string().min(1),
    version: z.literal("v1"),
    sourceApp: z.string().min(1),
    actorId: z.string().min(1),
    actorType: docActorTypeSchema,
    targetType: z.string().min(1),
    targetId: z.string().min(1),
    occurredAt: isoDateSchema,
    payload: jsonRecordSchema,
    metadata: jsonRecordSchema.nullable(),
});
export const mcpDocResourceSchema = z.object({
    uri: z.string().min(1),
    resourceType: z.enum(["doc", "doc_version", "context", "entity", "timeline", "suggestions"]),
    targetType: z.string().min(1),
    targetId: z.string().min(1),
    version: z.number().int().positive(),
    contentHash: z.string().min(1),
    payload: jsonRecordSchema,
    lastGeneratedAt: isoDateSchema,
    lastReadAt: isoDateSchema.nullable(),
});
export const documentDetailSchema = documentSummarySchema.extend({
    currentVersion: documentVersionSchema.nullable(),
    blocks: z.array(documentBlockSchema),
    entities: z.array(knowledgeNodeSchema),
    relations: z.array(knowledgeEdgeSchema),
    suggestions: z.array(suggestionSchema),
    contextPackages: z.array(contextPackageSchema),
    timeline: z.array(timelineEventSchema),
});
export const MATRIZ_DOCS_CONTRACT_VERSION = "v1";
//# sourceMappingURL=index.js.map