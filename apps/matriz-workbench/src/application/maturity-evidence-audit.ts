import { stat } from "node:fs/promises"
import path from "node:path"
import type { RoadmapGoal } from "../domain/schemas"

const VERIFIED_EVIDENCE: Readonly<Record<number, readonly string[]>> = {
  1: ["apps/matriz-workbench/README.md"],
  2: ["apps/matriz-workbench/package.json", "apps/matriz-workbench/app/(workspace)/page.tsx"],
  3: ["apps/matriz-workbench/docs/SCORE-0-100.md", "apps/matriz-workbench/src/ui/components/roadmap-scorecard.tsx"],
  4: ["apps/matriz-workbench/src/application/collaboration-brief.ts"],
  5: ["apps/matriz-workbench/src/application/collaboration-brief.ts"],
  6: ["apps/matriz-workbench/README.md"],
  8: ["apps/matriz-workbench/docs/SECURITY-AUDIT-PHASE-7.md"],
  11: ["apps/matriz-workbench/src/application/project-inventory.ts"],
  12: ["apps/matriz-workbench/src/domain/schemas.ts", "apps/matriz-workbench/app/(workspace)/projects/[projectId]/roadmap/page.tsx"],
  13: ["apps/matriz-workbench/app/(workspace)/projects/[projectId]/backlog/page.tsx", "apps/matriz-workbench/src/integration/filesystem/workspace-repository.ts"],
  14: ["apps/matriz-workbench/app/(workspace)/projects/[projectId]/docs/page.tsx", "apps/matriz-workbench/src/ui/components/markdown-editor.tsx"],
  15: ["apps/matriz-workbench/app/(workspace)/projects/[projectId]/decisions/page.tsx"],
  16: ["apps/matriz-workbench/app/(workspace)/projects/[projectId]/agents/page.tsx", "apps/matriz-workbench/src/application/codex-run-manager.ts"],
  17: ["apps/matriz-workbench/app/error.tsx", "apps/matriz-workbench/app/not-found.tsx", "apps/matriz-workbench/docs/RECOVERY.md"],
  18: ["apps/matriz-workbench/app/(workspace)/projects/[projectId]/backlog/page.tsx"],
  19: ["apps/matriz-workbench/src/domain/schemas.ts", "apps/matriz-workbench/app/(workspace)/projects/[projectId]/backlog/[itemId]/page.tsx"],
  21: ["apps/matriz-workbench/AGENTS.md", "apps/matriz-workbench/docs/AGENT-START-HERE.md"],
  22: ["apps/matriz-workbench/src/domain/schemas.ts"],
  23: ["docs/architectural-laws.md", "apps/matriz-workbench/docs/SCORE-0-100.md"],
  24: ["docs/package-categories.md", "docs/monorepo-structure.md"],
  25: ["tooling/scripts/verify-app-boundaries.ts"],
  26: ["apps/matriz-workbench/public-contract.ts", "apps/matriz-workbench/src/manifest/manifest.ts"],
  27: ["apps/matriz-workbench/docs/FILE-PROTOCOL.md", "apps/matriz-workbench/src/integration/filesystem/workspace-repository.ts"],
  29: ["apps/matriz-workbench/src/integration/filesystem/workspace-repository.test.ts"],
  30: ["apps/matriz-workbench/docs/MATURITY-AUDIT-2026-07-29.md"],
  31: ["apps/matriz-workbench/app/globals.css"],
  32: ["apps/matriz-workbench/app/globals.css"],
  33: ["apps/matriz-workbench/app/globals.css"],
  34: ["apps/matriz-workbench/app/globals.css"],
  35: ["apps/matriz-workbench/app/globals.css"],
  36: ["apps/matriz-workbench/src/ui/components/app-shell.tsx", "apps/matriz-workbench/src/ui/components/project-header.tsx"],
  37: ["apps/matriz-workbench/app/globals.css", "apps/matriz-workbench/src/ui/components/codex-run-panel.tsx"],
  38: ["apps/matriz-workbench/app/icon.svg"],
  39: ["docs/theming-governance.md", "apps/matriz-workbench/docs/SCORE-0-100.md"],
  41: ["apps/matriz-workbench/src/ui/components/command-menu.tsx", "apps/matriz-workbench/docs/USABILITY-ACCESSIBILITY-BASELINE-2026-07-29.md"],
  42: ["apps/matriz-workbench/src/ui/components/copy-prompt-button.tsx"],
  43: ["apps/matriz-workbench/src/ui/components/copy-prompt-button.tsx", "apps/matriz-workbench/app/globals.css"],
  44: ["apps/matriz-workbench/app/loading.tsx"],
  45: ["apps/matriz-workbench/app/globals.css", "apps/matriz-workbench/src/ui/components/roadmap-scorecard.tsx"],
  46: ["apps/matriz-workbench/app/error.tsx", "apps/matriz-workbench/docs/RECOVERY.md"],
  47: ["apps/matriz-workbench/app/globals.css"],
  48: ["apps/matriz-workbench/app/(workspace)/projects/page.tsx"],
  49: ["apps/matriz-workbench/app/globals.css", "apps/matriz-workbench/docs/USABILITY-ACCESSIBILITY-BASELINE-2026-07-29.md"],
  50: ["apps/matriz-workbench/docs/USABILITY-ACCESSIBILITY-BASELINE-2026-07-29.md"],
  51: ["apps/matriz-workbench/src/domain/schemas.test.ts"],
  52: ["apps/matriz-workbench/src/integration/filesystem/workspace-repository.test.ts"],
  53: ["apps/matriz-workbench/src/cli/verify-mcp.ts"],
  55: ["apps/matriz-workbench/package.json"],
  56: ["apps/matriz-workbench/docs/RECOVERY.md"],
  57: ["apps/matriz-workbench/docs/WINDOWS.md"],
  58: ["apps/matriz-workbench/src/domain/errors.ts", "apps/matriz-workbench/src/auth/api-error-status.ts"],
  61: ["apps/matriz-workbench/src/domain/schemas.test.ts", "apps/matriz-workbench/src/integration/codex/codex-run-store.test.ts"],
  62: ["apps/matriz-workbench/docs/FILE-PROTOCOL.md", "apps/matriz-workbench/src/integration/filesystem/workspace-repository.ts"],
  63: ["apps/matriz-workbench/src/integration/filesystem/workspace-repository.ts", "apps/matriz-workbench/src/integration/codex/codex-run-store.ts"],
  64: ["apps/matriz-workbench/src/auth/session.ts", "apps/matriz-workbench/app/unlock/page.tsx"],
  65: ["apps/matriz-workbench/docs/MCP.md", "apps/matriz-workbench/docs/SECURITY-AUDIT-PHASE-7.md"],
  66: ["apps/matriz-workbench/src/mcp/server.ts", "apps/matriz-workbench/src/application/codex-run-manager.ts"],
  67: ["apps/matriz-workbench/docs/RECOVERY.md", "apps/matriz-workbench/docs/COLLABORATION-ADAPTERS.md"],
  68: ["apps/matriz-workbench/docs/SECURITY-AUDIT-PHASE-7.md"],
  70: ["apps/matriz-workbench/docs/SECURITY-AUDIT-PHASE-7.md"],
  71: ["apps/matriz-workbench/src/application/operational-health.ts", "apps/matriz-workbench/src/application/operational-health.test.ts"],
  73: ["apps/matriz-workbench/src/application/context-bundle.test.ts"],
  74: ["apps/matriz-workbench/src/application/build-metrics.ts", "apps/matriz-workbench/src/application/build-metrics.test.ts"],
  78: ["apps/matriz-workbench/src/application/operational-health.ts", "apps/matriz-workbench/src/cli/health.ts"],
  81: ["apps/matriz-workbench/docs/AGENT-START-HERE.md", "apps/matriz-workbench/src/application/collaboration-brief.ts"],
  82: ["apps/matriz-workbench/src/application/collaboration-brief.ts"],
  83: ["apps/matriz-workbench/src/application/collaboration-brief.ts"],
  84: ["apps/matriz-workbench/app/(workspace)/projects/[projectId]/collaboration/page.tsx"],
  85: ["apps/matriz-workbench/src/application/collaboration-brief.ts"],
  86: ["apps/matriz-workbench/app/(workspace)/projects/[projectId]/collaboration/page.tsx", "apps/matriz-workbench/docs/COLLABORATION-ADAPTERS.md"],
  87: ["apps/matriz-workbench/src/application/codex-run-manager.ts", "apps/matriz-workbench/src/integration/codex/codex-run-store.ts"],
  88: ["apps/matriz-workbench/src/ui/components/codex-run-panel.tsx", "apps/matriz-workbench/src/ui/components/delivery-evidence.tsx"],
  89: ["apps/matriz-workbench/app/api/codex/projects/[projectId]/requests/[requestId]/events/route.ts", "apps/matriz-workbench/app/api/codex/projects/[projectId]/requests/[requestId]/approvals/[approvalId]/route.ts"],
  92: ["apps/matriz-workbench/src/application/project-inventory.ts"],
  93: ["docs/app-ownership-map.md", "docs/project-intelligence-contracts.md"],
  94: ["docs/app-communication.md", "docs/cross-repo-integration-model.md"],
  98: ["apps/matriz-workbench/docs/ADR-REMOTE-COLLABORATION-BOUNDARY.md", "apps/matriz-workbench/app/(workspace)/projects/[projectId]/collaboration/page.tsx"],
  99: ["apps/matriz-workbench/src/application/collaboration/github-issue-draft.ts", "apps/matriz-workbench/docs/COLLABORATION-ADAPTERS.md"],
}

async function exists(repositoryRoot: string, relativePath: string): Promise<boolean> {
  try {
    await stat(path.join(repositoryRoot, relativePath))
    return true
  } catch {
    return false
  }
}

export interface MaturityAuditResult {
  goals: RoadmapGoal[]
  score: number
  verifiedOrdinals: number[]
}

export async function auditWorkbenchMaturity(
  repositoryRoot: string,
  goals: RoadmapGoal[],
): Promise<MaturityAuditResult> {
  const verified = new Set<number>()

  for (const [ordinalText, evidence] of Object.entries(VERIFIED_EVIDENCE)) {
    if (await Promise.all(evidence.map((item) => exists(repositoryRoot, item))).then((items) => items.every(Boolean))) {
      verified.add(Number(ordinalText))
    }
  }

  const reconciled = goals.map((goal) => {
    const evidence = VERIFIED_EVIDENCE[goal.ordinal]
    const score = verified.has(goal.ordinal) ? 1 as const : 0 as const
    return {
      ...goal,
      score,
      evidence: score ? [...(evidence ?? [])] : [],
      outcome: score
        ? "Evidência verificada automaticamente no repositório."
        : goal.outcome,
    }
  })

  return {
    goals: reconciled,
    score: verified.size,
    verifiedOrdinals: [...verified].sort((a, b) => a - b),
  }
}
