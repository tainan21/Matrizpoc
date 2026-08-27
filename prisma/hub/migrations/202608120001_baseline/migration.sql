CREATE SCHEMA IF NOT EXISTS "hub";
SET search_path TO "hub";

-- CreateTable
CREATE TABLE "institutional_projects" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "trustLevel" TEXT NOT NULL,
    "ingestMode" TEXT NOT NULL,
    "institutionalTags" TEXT[],
    "manifestJson" JSONB NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institutional_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institutional_sources" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "ingestMode" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institutional_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institutional_ingestion_runs" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3) NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "accepted" INTEGER NOT NULL,
    "rejected" INTEGER NOT NULL,
    "errorsJson" JSONB,
    "reportJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "institutional_ingestion_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institutional_health_snapshots" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "readinessScore" INTEGER NOT NULL,
    "uptimePercent" DOUBLE PRECISION,
    "snapshotJson" JSONB NOT NULL,

    CONSTRAINT "institutional_health_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institutional_public_metrics_snapshots" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "metricsJson" JSONB NOT NULL,

    CONSTRAINT "institutional_public_metrics_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doc_documents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT,
    "spaceId" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "visibility" TEXT NOT NULL,
    "sensitivity" TEXT NOT NULL,
    "currentVersionId" TEXT,
    "createdByActorId" TEXT NOT NULL,
    "createdByActorType" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doc_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doc_document_versions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "titleSnapshot" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "summary" TEXT,
    "aiSummary" TEXT,
    "changeReason" TEXT,
    "createdByActorId" TEXT NOT NULL,
    "createdByActorType" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "deprecatedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doc_document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doc_blocks" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "parentBlockId" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "plainText" TEXT NOT NULL,
    "sensitivity" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doc_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doc_chunks" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "blockId" TEXT,
    "chunkText" TEXT NOT NULL,
    "embedding" JSONB,
    "tokenCount" INTEGER NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doc_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doc_source_artifacts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentId" TEXT,
    "versionId" TEXT,
    "artifactType" TEXT NOT NULL,
    "originalFileName" TEXT,
    "mimeType" TEXT,
    "storageKey" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "checksum" TEXT,
    "sourceKind" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doc_source_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doc_conversion_runs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "sourceArtifactId" TEXT,
    "status" TEXT NOT NULL,
    "runType" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "actorId" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "logs" JSONB,
    "result" JSONB,
    "error" JSONB,

    CONSTRAINT "doc_conversion_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_nodes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "canonicalRefType" TEXT,
    "canonicalRefId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_edges" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sourceNodeId" TEXT NOT NULL,
    "targetNodeId" TEXT NOT NULL,
    "relationType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "evidence" JSONB NOT NULL,
    "createdByActorId" TEXT NOT NULL,
    "createdByActorType" TEXT NOT NULL,
    "approvedByActorId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_edges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doc_entity_mentions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "mentionText" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "status" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doc_entity_mentions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doc_suggestions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "evidence" JSONB NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdByActorId" TEXT NOT NULL,
    "createdByActorType" TEXT NOT NULL,
    "reviewedByActorId" TEXT,
    "reviewedByActorType" TEXT,
    "result" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doc_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doc_context_packages" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "audience" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "visibility" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "summary" TEXT,
    "mcpUri" TEXT,
    "lastPublishedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doc_context_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doc_context_package_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contextPackageId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "versionId" TEXT,
    "blockId" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "label" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doc_context_package_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doc_timeline_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "sourceApp" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "payload" JSONB NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doc_timeline_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doc_mcp_resource_snapshots" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "uri" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "contentHash" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "lastGeneratedAt" TIMESTAMP(3) NOT NULL,
    "lastReadAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doc_mcp_resource_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doc_export_artifacts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentId" TEXT,
    "contextPackageId" TEXT,
    "versionId" TEXT,
    "exportType" TEXT NOT NULL,
    "storageKey" TEXT,
    "contentHash" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "generatedByActorId" TEXT NOT NULL,
    "generatedByActorType" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doc_export_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doc_task_candidates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "blockId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "targetSprintRef" TEXT,
    "externalLinkId" TEXT,
    "createdByActorId" TEXT NOT NULL,
    "createdByActorType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doc_task_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doc_governance_candidates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "blockId" TEXT,
    "reason" TEXT NOT NULL,
    "sensitivity" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "externalLinkId" TEXT,
    "createdByActorId" TEXT NOT NULL,
    "createdByActorType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doc_governance_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doc_actor_runs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "runType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "input" JSONB,
    "output" JSONB,
    "error" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doc_actor_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doc_access_policies" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "visibility" TEXT NOT NULL,
    "sensitivity" TEXT NOT NULL,
    "rules" JSONB NOT NULL,
    "createdByActorId" TEXT NOT NULL,
    "createdByActorType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doc_access_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "institutional_projects_projectId_key" ON "institutional_projects"("projectId");

-- CreateIndex
CREATE INDEX "institutional_projects_sourceType_idx" ON "institutional_projects"("sourceType");

-- CreateIndex
CREATE INDEX "institutional_projects_trustLevel_idx" ON "institutional_projects"("trustLevel");

-- CreateIndex
CREATE INDEX "institutional_projects_lastSeenAt_idx" ON "institutional_projects"("lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "institutional_sources_sourceId_key" ON "institutional_sources"("sourceId");

-- CreateIndex
CREATE INDEX "institutional_sources_sourceType_idx" ON "institutional_sources"("sourceType");

-- CreateIndex
CREATE INDEX "institutional_ingestion_runs_sourceId_startedAt_idx" ON "institutional_ingestion_runs"("sourceId", "startedAt");

-- CreateIndex
CREATE INDEX "institutional_ingestion_runs_startedAt_idx" ON "institutional_ingestion_runs"("startedAt");

-- CreateIndex
CREATE INDEX "institutional_health_snapshots_projectId_capturedAt_idx" ON "institutional_health_snapshots"("projectId", "capturedAt");

-- CreateIndex
CREATE INDEX "institutional_health_snapshots_capturedAt_idx" ON "institutional_health_snapshots"("capturedAt");

-- CreateIndex
CREATE INDEX "institutional_public_metrics_snapshots_projectId_capturedAt_idx" ON "institutional_public_metrics_snapshots"("projectId", "capturedAt");

-- CreateIndex
CREATE INDEX "institutional_public_metrics_snapshots_capturedAt_idx" ON "institutional_public_metrics_snapshots"("capturedAt");

-- CreateIndex
CREATE INDEX "doc_documents_tenantId_status_idx" ON "doc_documents"("tenantId", "status");

-- CreateIndex
CREATE INDEX "doc_documents_tenantId_type_idx" ON "doc_documents"("tenantId", "type");

-- CreateIndex
CREATE INDEX "doc_documents_tenantId_visibility_idx" ON "doc_documents"("tenantId", "visibility");

-- CreateIndex
CREATE INDEX "doc_documents_tenantId_sensitivity_idx" ON "doc_documents"("tenantId", "sensitivity");

-- CreateIndex
CREATE INDEX "doc_documents_projectId_idx" ON "doc_documents"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "doc_documents_tenantId_slug_key" ON "doc_documents"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "doc_document_versions_tenantId_status_idx" ON "doc_document_versions"("tenantId", "status");

-- CreateIndex
CREATE INDEX "doc_document_versions_documentId_idx" ON "doc_document_versions"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "doc_document_versions_tenantId_documentId_versionNumber_key" ON "doc_document_versions"("tenantId", "documentId", "versionNumber");

-- CreateIndex
CREATE INDEX "doc_blocks_tenantId_documentId_versionId_idx" ON "doc_blocks"("tenantId", "documentId", "versionId");

-- CreateIndex
CREATE INDEX "doc_blocks_tenantId_type_idx" ON "doc_blocks"("tenantId", "type");

-- CreateIndex
CREATE INDEX "doc_blocks_tenantId_sensitivity_idx" ON "doc_blocks"("tenantId", "sensitivity");

-- CreateIndex
CREATE INDEX "doc_chunks_tenantId_documentId_idx" ON "doc_chunks"("tenantId", "documentId");

-- CreateIndex
CREATE INDEX "doc_chunks_tenantId_versionId_idx" ON "doc_chunks"("tenantId", "versionId");

-- CreateIndex
CREATE INDEX "doc_source_artifacts_tenantId_artifactType_idx" ON "doc_source_artifacts"("tenantId", "artifactType");

-- CreateIndex
CREATE INDEX "doc_source_artifacts_tenantId_sourceKind_idx" ON "doc_source_artifacts"("tenantId", "sourceKind");

-- CreateIndex
CREATE INDEX "doc_conversion_runs_tenantId_status_idx" ON "doc_conversion_runs"("tenantId", "status");

-- CreateIndex
CREATE INDEX "doc_conversion_runs_tenantId_runType_idx" ON "doc_conversion_runs"("tenantId", "runType");

-- CreateIndex
CREATE INDEX "doc_conversion_runs_documentId_startedAt_idx" ON "doc_conversion_runs"("documentId", "startedAt");

-- CreateIndex
CREATE INDEX "knowledge_nodes_tenantId_type_idx" ON "knowledge_nodes"("tenantId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_nodes_tenantId_slug_key" ON "knowledge_nodes"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "knowledge_edges_tenantId_relationType_idx" ON "knowledge_edges"("tenantId", "relationType");

-- CreateIndex
CREATE INDEX "knowledge_edges_tenantId_status_idx" ON "knowledge_edges"("tenantId", "status");

-- CreateIndex
CREATE INDEX "knowledge_edges_sourceNodeId_idx" ON "knowledge_edges"("sourceNodeId");

-- CreateIndex
CREATE INDEX "knowledge_edges_targetNodeId_idx" ON "knowledge_edges"("targetNodeId");

-- CreateIndex
CREATE INDEX "doc_entity_mentions_tenantId_status_idx" ON "doc_entity_mentions"("tenantId", "status");

-- CreateIndex
CREATE INDEX "doc_entity_mentions_documentId_versionId_idx" ON "doc_entity_mentions"("documentId", "versionId");

-- CreateIndex
CREATE INDEX "doc_entity_mentions_nodeId_idx" ON "doc_entity_mentions"("nodeId");

-- CreateIndex
CREATE INDEX "doc_suggestions_tenantId_type_idx" ON "doc_suggestions"("tenantId", "type");

-- CreateIndex
CREATE INDEX "doc_suggestions_tenantId_status_idx" ON "doc_suggestions"("tenantId", "status");

-- CreateIndex
CREATE INDEX "doc_suggestions_targetType_targetId_idx" ON "doc_suggestions"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "doc_context_packages_tenantId_status_idx" ON "doc_context_packages"("tenantId", "status");

-- CreateIndex
CREATE INDEX "doc_context_packages_tenantId_audience_idx" ON "doc_context_packages"("tenantId", "audience");

-- CreateIndex
CREATE UNIQUE INDEX "doc_context_packages_tenantId_slug_key" ON "doc_context_packages"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "doc_context_package_items_tenantId_contextPackageId_idx" ON "doc_context_package_items"("tenantId", "contextPackageId");

-- CreateIndex
CREATE INDEX "doc_context_package_items_documentId_idx" ON "doc_context_package_items"("documentId");

-- CreateIndex
CREATE INDEX "doc_timeline_events_tenantId_occurredAt_idx" ON "doc_timeline_events"("tenantId", "occurredAt");

-- CreateIndex
CREATE INDEX "doc_timeline_events_tenantId_targetType_targetId_idx" ON "doc_timeline_events"("tenantId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "doc_timeline_events_tenantId_name_idx" ON "doc_timeline_events"("tenantId", "name");

-- CreateIndex
CREATE INDEX "doc_mcp_resource_snapshots_tenantId_resourceType_idx" ON "doc_mcp_resource_snapshots"("tenantId", "resourceType");

-- CreateIndex
CREATE INDEX "doc_mcp_resource_snapshots_targetType_targetId_idx" ON "doc_mcp_resource_snapshots"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "doc_mcp_resource_snapshots_tenantId_uri_key" ON "doc_mcp_resource_snapshots"("tenantId", "uri");

-- CreateIndex
CREATE INDEX "doc_export_artifacts_tenantId_exportType_idx" ON "doc_export_artifacts"("tenantId", "exportType");

-- CreateIndex
CREATE INDEX "doc_export_artifacts_tenantId_status_idx" ON "doc_export_artifacts"("tenantId", "status");

-- CreateIndex
CREATE INDEX "doc_task_candidates_tenantId_status_idx" ON "doc_task_candidates"("tenantId", "status");

-- CreateIndex
CREATE INDEX "doc_task_candidates_documentId_idx" ON "doc_task_candidates"("documentId");

-- CreateIndex
CREATE INDEX "doc_governance_candidates_tenantId_status_idx" ON "doc_governance_candidates"("tenantId", "status");

-- CreateIndex
CREATE INDEX "doc_governance_candidates_tenantId_sensitivity_idx" ON "doc_governance_candidates"("tenantId", "sensitivity");

-- CreateIndex
CREATE INDEX "doc_governance_candidates_documentId_idx" ON "doc_governance_candidates"("documentId");

-- CreateIndex
CREATE INDEX "doc_actor_runs_tenantId_actorType_idx" ON "doc_actor_runs"("tenantId", "actorType");

-- CreateIndex
CREATE INDEX "doc_actor_runs_tenantId_runType_status_idx" ON "doc_actor_runs"("tenantId", "runType", "status");

-- CreateIndex
CREATE INDEX "doc_access_policies_tenantId_targetType_targetId_idx" ON "doc_access_policies"("tenantId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "doc_access_policies_tenantId_visibility_idx" ON "doc_access_policies"("tenantId", "visibility");

-- AddForeignKey
ALTER TABLE "institutional_ingestion_runs" ADD CONSTRAINT "institutional_ingestion_runs_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "institutional_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "institutional_health_snapshots" ADD CONSTRAINT "institutional_health_snapshots_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "institutional_projects"("projectId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "institutional_public_metrics_snapshots" ADD CONSTRAINT "institutional_public_metrics_snapshots_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "institutional_projects"("projectId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_documents" ADD CONSTRAINT "doc_documents_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "doc_document_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_document_versions" ADD CONSTRAINT "doc_document_versions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "doc_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_blocks" ADD CONSTRAINT "doc_blocks_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "doc_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_blocks" ADD CONSTRAINT "doc_blocks_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "doc_document_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_blocks" ADD CONSTRAINT "doc_blocks_parentBlockId_fkey" FOREIGN KEY ("parentBlockId") REFERENCES "doc_blocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_chunks" ADD CONSTRAINT "doc_chunks_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "doc_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_chunks" ADD CONSTRAINT "doc_chunks_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "doc_document_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_chunks" ADD CONSTRAINT "doc_chunks_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "doc_blocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_source_artifacts" ADD CONSTRAINT "doc_source_artifacts_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "doc_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_source_artifacts" ADD CONSTRAINT "doc_source_artifacts_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "doc_document_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_conversion_runs" ADD CONSTRAINT "doc_conversion_runs_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "doc_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_conversion_runs" ADD CONSTRAINT "doc_conversion_runs_sourceArtifactId_fkey" FOREIGN KEY ("sourceArtifactId") REFERENCES "doc_source_artifacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_edges" ADD CONSTRAINT "knowledge_edges_sourceNodeId_fkey" FOREIGN KEY ("sourceNodeId") REFERENCES "knowledge_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_edges" ADD CONSTRAINT "knowledge_edges_targetNodeId_fkey" FOREIGN KEY ("targetNodeId") REFERENCES "knowledge_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_entity_mentions" ADD CONSTRAINT "doc_entity_mentions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "doc_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_entity_mentions" ADD CONSTRAINT "doc_entity_mentions_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "doc_document_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_entity_mentions" ADD CONSTRAINT "doc_entity_mentions_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "doc_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_entity_mentions" ADD CONSTRAINT "doc_entity_mentions_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "knowledge_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_context_package_items" ADD CONSTRAINT "doc_context_package_items_contextPackageId_fkey" FOREIGN KEY ("contextPackageId") REFERENCES "doc_context_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_context_package_items" ADD CONSTRAINT "doc_context_package_items_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "doc_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_context_package_items" ADD CONSTRAINT "doc_context_package_items_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "doc_document_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_context_package_items" ADD CONSTRAINT "doc_context_package_items_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "doc_blocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_export_artifacts" ADD CONSTRAINT "doc_export_artifacts_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "doc_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_export_artifacts" ADD CONSTRAINT "doc_export_artifacts_contextPackageId_fkey" FOREIGN KEY ("contextPackageId") REFERENCES "doc_context_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_export_artifacts" ADD CONSTRAINT "doc_export_artifacts_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "doc_document_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_task_candidates" ADD CONSTRAINT "doc_task_candidates_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "doc_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_task_candidates" ADD CONSTRAINT "doc_task_candidates_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "doc_blocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_governance_candidates" ADD CONSTRAINT "doc_governance_candidates_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "doc_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_governance_candidates" ADD CONSTRAINT "doc_governance_candidates_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "doc_blocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
