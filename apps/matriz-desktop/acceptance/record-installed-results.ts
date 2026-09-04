import { mkdir, writeFile } from "node:fs/promises"
import { readFile } from "node:fs/promises"
import path from "node:path"

import { ACCEPTANCE_CASES } from "../src/acceptance/catalog"
import { acceptanceIdsForJourney } from "../src/acceptance/evidence-map"

function argument(name: string): string {
  const index = process.argv.indexOf(name)
  const value = index >= 0 ? process.argv[index + 1] : undefined
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

const runId = argument("--run-id")
const outputRoot = path.resolve(argument("--output-root"))
const commit = argument("--commit")
const artifactSha256 = argument("--artifact-sha256").toLowerCase()
const durationMs = Number(argument("--duration-ms"))
const evidencePath = path.resolve(argument("--playwright-evidence"))
const installationPath = path.resolve(argument("--installation-evidence"))
const lifecyclePath = path.resolve(argument("--lifecycle-evidence"))
const trackedArtifactsPath = path.resolve(argument("--tracked-artifacts-evidence"))

if (!/^[a-f0-9]{64}$/.test(artifactSha256)) throw new Error("Invalid installer SHA-256")
if (!Number.isFinite(durationMs) || durationMs < 0) throw new Error("Invalid acceptance duration")
if (path.dirname(evidencePath) !== outputRoot) throw new Error("Playwright evidence must belong to the acceptance run")
if (path.dirname(installationPath) !== outputRoot || path.dirname(lifecyclePath) !== outputRoot || path.dirname(trackedArtifactsPath) !== outputRoot) throw new Error("Installed evidence must belong to the acceptance run")

const startedAt = new Date(Date.now() - durationMs).toISOString()
const evidenceDocument = JSON.parse(await readFile(evidencePath, "utf8")) as { schemaVersion?: unknown; status?: unknown; journeys?: unknown }
if (evidenceDocument.schemaVersion !== "v1" || evidenceDocument.status !== "passed" || !Array.isArray(evidenceDocument.journeys)) throw new Error("Invalid Playwright evidence")
const installation = JSON.parse(await readFile(installationPath, "utf8")) as Record<string, unknown>
const lifecycle = JSON.parse(await readFile(lifecyclePath, "utf8")) as Record<string, unknown>
const trackedArtifacts = JSON.parse(await readFile(trackedArtifactsPath, "utf8")) as Record<string, unknown>
if (installation.schemaVersion !== "v1" || installation.runId !== runId || installation.mode !== "Installed" || installation.target !== "packaged-candidate" || installation.installerSha256 !== artifactSha256 || installation.productName !== "Matriz Control") throw new Error("Invalid installation evidence")
if (lifecycle.schemaVersion !== "v1" || lifecycle.runId !== runId || lifecycle.status !== "pass" || lifecycle.installerSha256 !== artifactSha256 || lifecycle.uninstalled !== true) throw new Error("Invalid lifecycle evidence")
if (trackedArtifacts.schemaVersion !== "v1" || trackedArtifacts.runId !== runId || trackedArtifacts.status !== "pass" || trackedArtifacts.commit !== commit) throw new Error("Invalid tracked-artifacts evidence")
const passedIds = new Set<string>()
for (const journey of evidenceDocument.journeys) {
  if (!journey || typeof journey !== "object" || (journey as { status?: unknown }).status !== "passed" || typeof (journey as { title?: unknown }).title !== "string") continue
  for (const id of acceptanceIdsForJourney((journey as { title: string }).title)) passedIds.add(id)
}
for (const id of ["INST-001", "INST-002", "INST-003", "INST-005", "INST-006"]) passedIds.add(id)
const evidenceFile = `${runId}/playwright-evidence.json`
const directInstallerEvidence = new Set(["INST-001", "INST-002", "INST-003", "INST-005", "INST-006"])
const results = ACCEPTANCE_CASES.map((acceptanceCase) => ({
  schemaVersion: "v1" as const,
  runId,
  id: acceptanceCase.id,
  target: "packaged-candidate" as const,
  status: passedIds.has(acceptanceCase.id) ? "pass" as const : "blocked" as const,
  startedAt,
  durationMs,
  commit,
  artifactSha256,
  summary: passedIds.has(acceptanceCase.id)
    ? directInstallerEvidence.has(acceptanceCase.id)
      ? `${acceptanceCase.id} passed through validated installation and lifecycle evidence`
      : `${acceptanceCase.id} passed through an explicitly mapped installed Playwright journey`
    : `${acceptanceCase.id} has no individual evidence mapping; suite success alone does not certify this case`,
  evidence: [
    `${runId}/e2e.log`,
    `${runId}/installation.json`,
    `${runId}/performance.json`,
    ...(directInstallerEvidence.has(acceptanceCase.id) ? [`${runId}/lifecycle.json`] : []),
    ...(acceptanceCase.id === "INST-006" ? [`${runId}/tracked-artifacts.json`, `${runId}/tracked-artifacts.log`] : []),
    ...(passedIds.has(acceptanceCase.id) ? [evidenceFile] : []),
  ],
}))

await mkdir(outputRoot, { recursive: true })
await writeFile(path.join(outputRoot, "results.json"), JSON.stringify(results, null, 2), "utf8")
await writeFile(path.join(outputRoot, "summary.json"), JSON.stringify({
  schemaVersion: "v1",
  runId,
  target: "packaged-candidate",
  status: "blocked",
  passed: results.filter((result) => result.status === "pass").length,
  blocked: results.filter((result) => result.status === "blocked").length,
  failed: 0,
  artifactSha256,
  commit,
}, null, 2), "utf8")
