/**
 * MCP resources exposed by the Hub.
 *
 * V1.3 exposes ONE real resource pattern:
 *   matriz://projects/{projectId}
 *
 * Reading the resource returns a JSON payload that bundles:
 *   - manifestJson    (latest ProjectManifest)
 *   - healthSnapshot  (latest InstitutionalHealthSnapshot, if any)
 *   - publicMetrics   (latest InstitutionalPublicMetricsSnapshot, if any)
 */
import { getHubDb } from "@matriz/platform-db/hub"
import {
  makeHealthSnapshotRepo,
  makeProjectRepo,
  makePublicMetricsRepo,
} from "@matriz/platform-db/hub/repositories"
import {
  listDocsMcpResources,
  readDocsMcpResource,
} from "../domains/docs/mcp/resources"
import type { McpPrincipal } from "./handler"

export type McpResourceDescriptor = {
  uri: string
  name: string
  description?: string
  mimeType?: string
}

export type McpResourceContent = {
  uri: string
  mimeType: string
  text: string
}

/**
 * Resource templates published by the Hub. MCP clients discover these via
 * `resources/list` and then call `resources/read` with a concrete URI.
 */
export async function listResources(principal: McpPrincipal): Promise<McpResourceDescriptor[]> {
  const projects = makeProjectRepo(getHubDb())
  const rows = await projects.listAll()
  const projectResources = rows.map((row) => ({
    uri: `matriz://projects/${row.projectId}`,
    name: row.projectId,
    description: `Institutional profile of ${row.projectId} (manifest + health + metrics).`,
    mimeType: "application/json",
  }))
  const docsResources = await listDocsMcpResources(principal.docsActor)
  return [...projectResources, ...docsResources]
}

/**
 * Read a concrete resource. Only `matriz://projects/{id}` is supported in V1.3.
 * Returns null if the URI is unknown so the handler can produce a proper MCP
 * error.
 */
export async function readResource(
  uri: string,
  principal: McpPrincipal,
): Promise<McpResourceContent | null> {
  const docsContent = await readDocsMcpResource(uri, principal.docsActor)
  if (docsContent) return docsContent

  const match = /^matriz:\/\/projects\/([^/]+)$/.exec(uri)
  if (!match) return null

  const projectId = decodeURIComponent(match[1]!)
  const db = getHubDb()
  const projects = makeProjectRepo(db)
  const project = await projects.findByProjectId(projectId)
  if (!project) return null

  const [health, metrics] = await Promise.all([
    makeHealthSnapshotRepo(db).latestForProject(projectId),
    makePublicMetricsRepo(db).latestForProject(projectId),
  ])

  const payload = {
    projectId: project.projectId,
    sourceType: project.sourceType,
    trustLevel: project.trustLevel,
    ingestMode: project.ingestMode,
    institutionalTags: project.institutionalTags,
    firstSeenAt: project.firstSeenAt.toISOString(),
    lastSeenAt: project.lastSeenAt.toISOString(),
    manifest: project.manifestJson,
    latestHealth: health
      ? {
          capturedAt: health.capturedAt.toISOString(),
          status: health.status,
          readinessScore: health.readinessScore,
          uptimePercent: health.uptimePercent,
          snapshot: health.snapshotJson,
        }
      : null,
    latestPublicMetrics: metrics
      ? {
          capturedAt: metrics.capturedAt.toISOString(),
          metrics: metrics.metricsJson,
        }
      : null,
  }

  return {
    uri,
    mimeType: "application/json",
    text: JSON.stringify(payload, null, 2),
  }
}
