import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

import { ACCEPTANCE_CASES } from "../src/acceptance/catalog"

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

if (!/^[a-f0-9]{64}$/.test(artifactSha256)) throw new Error("Invalid installer SHA-256")
if (!Number.isFinite(durationMs) || durationMs < 0) throw new Error("Invalid acceptance duration")

const startedAt = new Date(Date.now() - durationMs).toISOString()
// A successful Playwright process verifies its executed journeys, not every
// contract ID. Leave cases unresolved until individual evidence is mapped.
const results = ACCEPTANCE_CASES.map((acceptanceCase) => ({
  schemaVersion: "v1" as const,
  runId,
  id: acceptanceCase.id,
  target: "packaged-candidate" as const,
  status: "blocked" as const,
  startedAt,
  durationMs,
  commit,
  artifactSha256,
  summary: `${acceptanceCase.id} has no individual evidence mapping; suite success alone does not certify this case`,
  evidence: [
    `${runId}/e2e.log`,
    `${runId}/installation.json`,
    `${runId}/performance.json`,
  ],
}))

await mkdir(outputRoot, { recursive: true })
await writeFile(path.join(outputRoot, "results.json"), JSON.stringify(results, null, 2), "utf8")
await writeFile(path.join(outputRoot, "summary.json"), JSON.stringify({
  schemaVersion: "v1",
  runId,
  target: "packaged-candidate",
  status: "blocked",
  passed: 0,
  blocked: results.length,
  failed: 0,
  artifactSha256,
  commit,
}, null, 2), "utf8")
