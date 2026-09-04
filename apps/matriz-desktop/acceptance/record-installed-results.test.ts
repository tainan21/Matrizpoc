// @vitest-environment node
import { spawnSync } from "node:child_process"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { expect, it } from "vitest"

it("certifies only contract cases backed by passed mapped journeys", async () => {
  const output = await mkdtemp(join(tmpdir(), "control-results-"))
  try {
    const script = fileURLToPath(new URL("./record-installed-results.ts", import.meta.url))
    const evidence = join(output, "playwright-evidence.json")
    const installation = join(output, "installation.json")
    const lifecycle = join(output, "lifecycle.json")
    const trackedArtifacts = join(output, "tracked-artifacts.json")
    const upgrade = join(output, "upgrade.json")
    await writeFile(evidence, JSON.stringify({ schemaVersion: "v1", status: "passed", journeys: [
      { title: "streams cwd and Unicode output, then remains interactive after Ctrl+C", status: "passed" },
      { title: "unknown broad suite", status: "passed" },
      { title: "builds, installs, starts, and stops the canonical native app", status: "failed" },
    ] }))
    await writeFile(installation, JSON.stringify({ schemaVersion: "v1", runId: "evidence-test", mode: "Installed", target: "packaged-candidate", installerSha256: "a".repeat(64), productName: "Matriz Control" }))
    await writeFile(lifecycle, JSON.stringify({ schemaVersion: "v1", runId: "evidence-test", status: "pass", installerSha256: "a".repeat(64), uninstalled: true }))
    await writeFile(trackedArtifacts, JSON.stringify({ schemaVersion: "v1", runId: "evidence-test", status: "pass", commit: "test" }))
    await writeFile(upgrade, JSON.stringify({ schemaVersion: "v1", runId: "evidence-test", status: "pass", toInstallerSha256: "a".repeat(64), settingsPreserved: true }))
    const result = spawnSync(process.execPath, ["--import", "tsx", script,
      "--run-id", "evidence-test", "--output-root", output, "--commit", "test",
      "--artifact-sha256", "a".repeat(64), "--duration-ms", "100", "--playwright-evidence", evidence,
      "--installation-evidence", installation, "--lifecycle-evidence", lifecycle,
      "--tracked-artifacts-evidence", trackedArtifacts,
      "--upgrade-evidence", upgrade,
    ], { cwd: resolve(dirname(script), ".."), encoding: "utf8" })
    expect(result.status, result.stderr).toBe(0)
    const results = JSON.parse(await readFile(join(output, "results.json"), "utf8")) as { id: string; status: string; summary: string }[]
    expect(results.length).toBeGreaterThan(0)
    expect(results.filter((entry) => entry.status === "pass").map((entry) => entry.id)).toEqual(["TERM-001", "TERM-002", "TERM-003", "TERM-007", "INST-001", "INST-002", "INST-003", "INST-004", "INST-005", "INST-006"])
    expect(results.find((entry) => entry.id === "NATIVE-001")?.status).toBe("blocked")
    expect(results.find((entry) => entry.id === "LIFE-001")?.summary).toContain("individual evidence")
    expect(JSON.parse(await readFile(join(output, "summary.json"), "utf8"))).toMatchObject({ status: "blocked", passed: 10, blocked: results.length - 10 })
  } finally { await rm(output, { recursive: true, force: true }) }
})
