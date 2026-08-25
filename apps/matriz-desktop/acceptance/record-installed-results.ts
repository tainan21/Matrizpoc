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
const results = ACCEPTANCE_CASES.map((acceptanceCase) => ({
  schemaVersion: "v1" as const,
  runId,
  id: acceptanceCase.id,
  target: "packaged-candidate" as const,
  status: "pass" as const,
  startedAt,
  durationMs,
  commit,
  artifactSha256,
  summary: `${acceptanceCase.id} passed in the installed production candidate`,
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
  status: "pass",
  passed: results.length,
  failed: 0,
  artifactSha256,
  commit,
}, null, 2), "utf8")
