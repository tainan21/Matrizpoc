import type {
  ContextPackageDTO,
  DocActorType,
  DocDocumentStatus,
  DocDocumentType,
  DocSensitivity,
  DocVisibility,
  DocumentSummaryDTO,
  KnowledgeRelationType,
  SuggestionDTO,
  TimelineEventDTO,
} from "@matriz/integration-api-contracts/v1/docs"

export const MATRIZ_DOCS_DEFAULT_TENANT = "tenant_demo" as const
export const MATRIZ_DOCS_SYSTEM_ACTOR_ID = "matrizdocs-system" as const

export interface DocsActorContext {
  tenantId: string
  actorId: string
  actorType: DocActorType
  displayName?: string
}

export interface CreateDocumentInput {
  title: string
  content: string
  type?: DocDocumentType
  status?: DocDocumentStatus
  visibility?: DocVisibility
  sensitivity?: DocSensitivity
  projectId?: string
  description?: string
  metadata?: Record<string, unknown>
}

export interface ImportDocumentInput extends CreateDocumentInput {
  sourceKind?: string
  originalFileName?: string
  mimeType?: string
}

export interface UpdateDocumentDraftInput {
  documentId: string
  title?: string
  content: string
  changeReason?: string
}

export interface CreateKnowledgeNodeInput {
  type: string
  name: string
  description?: string
  canonicalRefType?: string
  canonicalRefId?: string
}

export interface CreateKnowledgeEdgeInput {
  sourceNodeId: string
  targetNodeId: string
  relationType: KnowledgeRelationType
  status?: "suggested" | "approved" | "rejected"
  confidence?: number
  evidence?: Record<string, unknown>
}

export interface CreateSuggestionInput {
  type: SuggestionDTO["type"]
  title: string
  description: string
  targetType: string
  targetId: string
  confidence?: number
  evidence?: Record<string, unknown>
}

export interface CreateContextPackageInput {
  title: string
  slug?: string
  description?: string
  audience?: string
  visibility?: DocVisibility
  documentIds?: string[]
}

export interface GenerateExportInput {
  targetType: "document" | "context_package"
  targetId: string
  exportType: "markdown" | "json" | "pdf"
  visibility?: DocVisibility
}

export interface DocsDashboardVM {
  stats: {
    totalDocuments: number
    publishedDocuments: number
    pendingSuggestions: number
    contextPackages: number
    mcpResources: number
  }
  documents: DocumentSummaryDTO[]
  suggestions: SuggestionDTO[]
  contexts: ContextPackageDTO[]
  timeline: TimelineEventDTO[]
}
