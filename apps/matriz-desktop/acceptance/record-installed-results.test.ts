// @vitest-environment node
import { spawnSync } from "node:child_process"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { expect, it } from "vitest"

it("does not certify every contract case from a successful suite exit alone", async () => {
  const output = await mkdtemp(join(tmpdir(), "control-results-"))
  try {
    const script = fileURLToPath(new URL("./record-installed-results.ts", import.meta.url))
    const result = spawnSync(process.execPath, ["--import", "tsx", script,
      "--run-id", "evidence-test", "--output-root", output, "--commit", "test",
      "--artifact-sha256", "a".repeat(64), "--duration-ms", "100",
    ], { cwd: resolve(dirname(script), ".."), encoding: "utf8" })
    expect(result.status, result.stderr).toBe(0)
    const results = JSON.parse(await readFile(join(output, "results.json"), "utf8")) as { status: string; summary: string }[]
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((entry) => entry.status === "blocked")).toBe(true)
    expect(results.every((entry) => entry.summary.includes("individual evidence"))).toBe(true)
    expect(JSON.parse(await readFile(join(output, "summary.json"), "utf8"))).toMatchObject({ status: "blocked", passed: 0, blocked: results.length })
  } finally { await rm(output, { recursive: true, force: true }) }
})
