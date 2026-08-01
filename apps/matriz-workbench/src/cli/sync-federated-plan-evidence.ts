import { stat } from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"
import type { Roadmap } from "../domain/schemas"
import { WorkspaceRepository } from "../integration/filesystem/workspace-repository"

export type EvidenceMap = Record<string, Record<number, string[]>>
export type ExactGoalBindings = Record<
  string,
  Record<number, { id: string; title: string }>
>

const WORKBENCH_EXACT_GOAL_BINDINGS: ExactGoalBindings = {
  "features-domains": {
    53: {
      id: "goal_2d02e0dd-1512-414c-8273-c5c0d35662df",
      title: "Estabelecer contratos de documentação e conhecimento conectado",
    },
    54: {
      id: "goal_b9364e23-6707-49a8-920d-2b067c1a27fb",
      title: "Implementar leitura de documentação e conhecimento conectado",
    },
    59: {
      id: "goal_07d75ded-0584-452a-b58e-81801cb7ffc6",
      title: "Validar uso real de documentação e conhecimento conectado",
    },
    60: {
      id: "goal_40a1c21e-1fad-451c-becd-d1e5bc613f0b",
      title: "Documentar evolução e reuso de documentação e conhecimento conectado",
    },
  },
}

const WORKBENCH_EVIDENCE: EvidenceMap = {
  app: {
    24: [
      "apps/matriz-workbench/src/ui/theme.ts",
      "apps/matriz-workbench/src/ui/components/theme-toggle.tsx",
      "apps/matriz-workbench/app/globals.css",
    ],
    29: [
      "apps/matriz-workbench/src/ui/theme.test.ts",
      "output/playwright/05-workbench-sites-light.png",
      "output/playwright/06-workbench-sites-dark.png",
    ],
    44: [
      "apps/matriz-workbench/app/(workspace)/projects/page.tsx",
      "apps/matriz-workbench/src/integration/filesystem/federated-source-repository.ts",
    ],
    49: [
      "apps/matriz-workbench/src/cli/verify-mcp.ts",
      "output/playwright/03-workbench-projects-full.png",
      "output/playwright/08-workbench-projects-mobile-dark.png",
    ],
  },
  docs: {
    23: [
      "apps/matriz-workbench/docs/FILE-PROTOCOL.md",
      "apps/matriz-workbench/docs/FEDERATED-PORTFOLIO.md",
    ],
    63: ["apps/matriz-workbench/docs/MCP.md"],
    64: [
      "apps/matriz-workbench/docs/MCP.md",
      "apps/matriz-workbench/src/cli/verify-mcp.ts",
    ],
  },
  "features-domains": {
    4: [
      "apps/matriz-workbench/src/integration/filesystem/federated-source-repository.ts",
    ],
    7: [
      "apps/matriz-workbench/src/integration/filesystem/federated-source-repository.test.ts",
    ],
    8: [
      "apps/matriz-workbench/src/integration/filesystem/federated-source-repository.test.ts",
    ],
    9: [
      "apps/matriz-workbench/src/cli/verify-mcp.ts",
      "output/playwright/04-matriz-lib-ui-knowledge-full.png",
    ],
    54: [
      "apps/matriz-workbench/src/integration/filesystem/federated-source-repository.ts",
      "apps/matriz-workbench/src/integration/filesystem/library-adoption-policy-repository.ts",
      "apps/matriz-workbench/src/application/library-adoption-readiness.ts",
    ],
    53: [
      "apps/matriz-workbench/src/domain/federated-sources.ts",
      "apps/matriz-workbench/src/domain/library-adoption.ts",
      "apps/matriz-workbench/docs/ADR-MATRIZ-LIB-UI-BOUNDARY.md",
    ],
    56: ["apps/matriz-workbench/src/application/context-bundle.ts"],
    57: [
      "apps/matriz-workbench/src/integration/filesystem/federated-source-repository.test.ts",
      "apps/matriz-workbench/src/application/context-bundle.test.ts",
    ],
    58: [
      "apps/matriz-workbench/src/integration/filesystem/federated-source-repository.test.ts",
      "apps/matriz-workbench/src/application/context-bundle.test.ts",
    ],
    59: [
      "apps/matriz-workbench/src/cli/verify-mcp.ts",
      "apps/matriz-workbench/docs/MCP.md",
    ],
    60: [
      "apps/matriz-workbench/docs/MATRIZ-LIB-UI-ADOPTION-AUDIT-2026-07-30.md",
    ],
    93: ["apps/matriz-workbench/src/domain/project-blueprints.ts"],
    95: ["apps/matriz-workbench/src/application/project-blueprints.ts"],
    97: [
      "apps/matriz-workbench/src/integration/filesystem/project-blueprint-repository.ts",
    ],
    98: ["apps/matriz-workbench/src/application/project-blueprints.test.ts"],
  },
}

const INFRA_DOCS_EVIDENCE: EvidenceMap = {
  docs: {
    11: [
      "docs/monorepo-structure.md",
      "apps/matriz-workbench/docs/FEDERATED-PORTFOLIO.md",
    ],
    12: [
      "apps/matriz-workbench/docs/FEDERATED-PORTFOLIO.md",
      "apps/matriz-workbench/docs/PROJECT-BLUEPRINTS.md",
    ],
    13: ["apps/matriz-workbench/docs/ADR-FEDERATED-PORTFOLIO.md"],
    17: [
      "apps/matriz-workbench/docs/PROJECT-BLUEPRINTS.md",
      "apps/matriz-workbench/docs/SITES-INTEGRATION.md",
    ],
    18: [
      "apps/matriz-workbench/docs/FEDERATED-PORTFOLIO.md",
      "apps/matriz-workbench/src/integration/filesystem/federated-source-repository.test.ts",
    ],
  },
}

async function assertEvidence(repositoryRoot: string, maps: EvidenceMap[]) {
  const references = new Set(
    maps.flatMap((map) =>
      Object.values(map).flatMap((goals) => Object.values(goals).flat()),
    ),
  )
  await Promise.all(
    [...references].map(async (reference) => {
      const metadata = await stat(path.join(repositoryRoot, reference))
      if (!metadata.isFile()) throw new Error(`Evidence is not a file: ${reference}`)
    }),
  )
}

export interface EvidenceDelta {
  scorecardSlug: string
  ordinal: number
  goalId: string
  title: string
  newlyScored: boolean
  evidenceAdded: string[]
}

export interface EvidenceProjection {
  projectId: string
  revision: string
  scorecards: Roadmap["scorecards"]
  changed: boolean
  deltas: EvidenceDelta[]
}

function semanticScorecards(scorecards: Roadmap["scorecards"]) {
  return scorecards.map((scorecard) => ({
    ...scorecard,
    goals: scorecard.goals.map((goal) => ({
      ...goal,
      evidence: [...new Set(goal.evidence)].sort(),
    })),
  }))
}

function validateExactGoalBindings(
  roadmap: Roadmap,
  projectId: string,
  evidence: EvidenceMap,
  exactGoalBindings: ExactGoalBindings,
): void {
  for (const [scorecardSlug, goals] of Object.entries(exactGoalBindings)) {
    const scorecard = roadmap.scorecards.find(
      (candidate) => candidate.slug === scorecardSlug,
    )
    for (const [ordinalText, binding] of Object.entries(goals)) {
      const ordinal = Number(ordinalText)
      const goal = scorecard?.goals.find(
        (candidate) => candidate.ordinal === ordinal,
      )
      if (
        !evidence[scorecardSlug]?.[ordinal] ||
        !goal ||
        goal.id !== binding.id ||
        goal.title !== binding.title
      ) {
        throw new Error(
          `Goal binding changed for ${projectId}/${scorecardSlug}/${ordinal}.`,
        )
      }
    }
  }
}

export function projectEvidence(
  roadmap: Roadmap,
  projectId: string,
  evidence: EvidenceMap,
  exactGoalBindings: ExactGoalBindings = {},
): EvidenceProjection {
  validateExactGoalBindings(roadmap, projectId, evidence, exactGoalBindings)
  const deltas: EvidenceDelta[] = []
  const scorecards = roadmap.scorecards.map((scorecard) => ({
    ...scorecard,
    goals: scorecard.goals.map((goal) => {
      const references = evidence[scorecard.slug]?.[goal.ordinal]
      if (!references) return goal

      const evidenceAdded = [...new Set(references)]
        .filter((reference) => !goal.evidence.includes(reference))
        .sort()
      const nextEvidence = [...new Set([...goal.evidence, ...references])].sort()
      const newlyScored = goal.score === 0
      if (newlyScored || evidenceAdded.length > 0) {
        deltas.push({
          scorecardSlug: scorecard.slug,
          ordinal: goal.ordinal,
          goalId: goal.id,
          title: goal.title,
          newlyScored,
          evidenceAdded,
        })
      }
      return {
        ...goal,
        score: 1 as const,
        evidence: nextEvidence,
        outcome:
          goal.outcome ||
          "Resultado verificado por implementação, teste ou comportamento observável.",
      }
    }),
  }))

  return {
    projectId,
    revision: roadmap.revision,
    scorecards,
    changed:
      JSON.stringify(semanticScorecards(scorecards)) !==
      JSON.stringify(semanticScorecards(roadmap.scorecards)),
    deltas,
  }
}

async function applyProjection(
  repository: WorkspaceRepository,
  projection: EvidenceProjection,
  dryRun: boolean,
) {
  if (dryRun || !projection.changed) {
    return {
      projectId: projection.projectId,
      changed: projection.changed,
      applied: false,
      deltas: projection.deltas,
    }
  }
  const next = await repository.updateRoadmapScorecards(
    projection.projectId,
    projection.scorecards,
    projection.revision,
    "codex",
  )
  return {
    projectId: projection.projectId,
    changed: true,
    applied: true,
    deltas: projection.deltas,
    revision: next.revision,
  }
}

async function main() {
  const dryRun = process.argv.slice(2).includes("--dry-run")
  const repository = await WorkspaceRepository.create()
  await assertEvidence(repository.repositoryRoot, [
    WORKBENCH_EVIDENCE,
    INFRA_DOCS_EVIDENCE,
  ])
  const [workbenchRoadmap, infraHubRoadmap] = await Promise.all([
    repository.getRoadmap("matriz-workbench"),
    repository.getRoadmap("matriz-infra-hub"),
  ])
  const projections = [
    projectEvidence(
      workbenchRoadmap,
      "matriz-workbench",
      WORKBENCH_EVIDENCE,
      WORKBENCH_EXACT_GOAL_BINDINGS,
    ),
    projectEvidence(
      infraHubRoadmap,
      "matriz-infra-hub",
      INFRA_DOCS_EVIDENCE,
    ),
  ]

  // Both projections and every evidence reference are validated before the
  // first write. Cross-file atomicity is not available: a later write can
  // still fail after an earlier one succeeds, and the output must be reviewed.
  const results = []
  for (const projection of projections) {
    results.push(await applyProjection(repository, projection, dryRun))
  }
  process.stdout.write(
    `${JSON.stringify({ mode: dryRun ? "dry-run" : "apply", projects: results }, null, 2)}\n`,
  )
}

const entryPoint = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : ""

if (import.meta.url === entryPoint) {
  main().catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : "Evidence sync failed."}\n`,
    )
    process.exitCode = 1
  })
}
