/**
 * MCP tools exposed by the Hub.
 *
 * V1.3 exposes ONE real tool:
 *   refresh_project_ingestion — triggers a pipeline run, persists the result
 *   via the Hub-owned Prisma repositories, and returns a summary.
 *
 * This proves: Hub acts as a real MCP control plane with actions that mutate
 * institutional state, not just read snapshots.
 */
import { persistIngestionRun } from "../institutional/persistence"
import { runInstitutionalIngestion } from "../institutional/bootstrap"
import { DOCS_MCP_TOOLS, callDocsTool } from "../domains/docs/mcp/tools"
import type { McpPrincipal } from "./handler"

export type McpToolDescriptor = {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

export type McpToolResult = {
  content: Array<{ type: "text"; text: string }>
  isError?: boolean
}

export const MCP_TOOLS: readonly McpToolDescriptor[] = [
  {
    name: "refresh_project_ingestion",
    description:
      "Re-executes the institutional ingestion pipeline and persists the result (projects, sources, ingestion runs). Returns a summary of the run.",
    inputSchema: {
      type: "object",
      properties: {
        // No required input in V1.3 — the pipeline is parameterless.
        dryRun: {
          type: "boolean",
          description:
            "If true, runs the pipeline in memory and skips DB persistence.",
          default: false,
        },
      },
      additionalProperties: false,
    },
  },
  ...DOCS_MCP_TOOLS,
]

export async function callTool(
  name: string,
  args: Record<string, unknown>,
  principal: McpPrincipal,
): Promise<McpToolResult> {
  const docsResult = await callDocsTool(name, args, principal.docsActor)
  if (docsResult) return docsResult

  switch (name) {
    case "refresh_project_ingestion":
      return await refreshProjectIngestion(args)
    default:
      return {
        isError: true,
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
      }
  }
}

async function refreshProjectIngestion(
  args: Record<string, unknown>,
): Promise<McpToolResult> {
  const dryRun = args.dryRun === true
  try {
    const report = await runInstitutionalIngestion()

    let dbSummary: { sourcesUpserted: number; runsRecorded: number; projectsUpserted: number } | null =
      null
    if (!dryRun) {
      dbSummary = await persistIngestionRun(report.run)
    }

    const summary = {
      dryRun,
      startedAt: report.run.startedAt,
      finishedAt: report.run.finishedAt,
      durationMs: report.run.durationMs,
      registry: {
        accepted: report.accepted,
        rejected: report.rejected.length,
        replacedAt: report.replacedAt,
      },
      db: dbSummary,
      adapters: report.run.byAdapter.map((a) => ({
        adapterId: a.adapterId,
        mode: a.mode,
        accepted: a.projects.length,
        rejected: a.errors.length,
      })),
    }

    return {
      content: [
        { type: "text", text: JSON.stringify(summary, null, 2) },
      ],
    }
  } catch {
    return {
      isError: true,
      content: [{ type: "text", text: "refresh_project_ingestion could not be completed." }],
    }
  }
}
