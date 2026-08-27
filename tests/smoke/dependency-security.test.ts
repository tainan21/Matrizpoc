import { describe, expect, it } from "vitest"
import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const ROOT = resolve(__dirname, "..", "..")
const pnpm = process.platform === "win32" ? "pnpm.exe" : "pnpm"

function runAuditGate(fixture: string) {
  return spawnSync(pnpm, ["run", "audit:prod", "--", "--input", fixture], {
    cwd: ROOT,
    encoding: "utf8",
  })
}

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(resolve(ROOT, path), "utf8")) as Record<string, unknown>
}

describe("production dependency audit gate", () => {
  it("accepts a production audit with no high or critical advisories", () => {
    const result = runAuditGate("tests/fixtures/audit/production-clean.json")

    expect(result.status).toBe(0)
    expect(result.stdout).toContain("critical=0")
    expect(result.stdout).toContain("high=0")
  })

  it("rejects a production audit with a high advisory", () => {
    const result = runAuditGate("tests/fixtures/audit/production-high.json")

    expect(result.status).toBe(1)
    expect(result.stderr).toContain("high or critical production advisories")
  })

  it("rejects a production audit with a critical advisory", () => {
    const result = runAuditGate("tests/fixtures/audit/production-critical.json")

    expect(result.status).toBe(1)
    expect(result.stderr).toContain("high or critical production advisories")
  })

  it.each([
    "production-incomplete.json",
    "production-non-integer.json",
    "production-negative.json",
  ])("rejects an invalid audit payload: %s", (fixture) => {
    const result = runAuditGate(`tests/fixtures/audit/${fixture}`)

    expect(result.status).toBe(1)
    expect(result.stderr).toContain("invalid production audit payload")
  })

  it("pins the approved production dependency versions in every consumer", () => {
    const root = readJson("package.json")
    const rootDevDependencies = root.devDependencies as Record<string, string>
    const rootPnpm = root.pnpm as { overrides: Record<string, string> }
    const apps = [
      "matriz-hub",
      "matriz-workbench",
      "matriz-admin",
      "matriz-control",
      "matrizlib",
      "spot",
      "seumeiapp",
      "contracts",
      "willdash",
      "sites",
    ]

    expect(rootDevDependencies.next).toBe("16.2.12")
    expect(rootPnpm.overrides["js-yaml"]).toBe("5.4.1")
    expect(rootPnpm.overrides.postcss).toBe("8.5.26")
    expect(rootPnpm.overrides.sharp).toBe("0.35.3")
    expect(rootPnpm.overrides.nanoid).toBe("3.3.18")

    for (const app of apps) {
      const manifest = readJson(`apps/${app}/package.json`)
      const dependencies = manifest.dependencies as Record<string, string>
      expect(dependencies.next).toBe("16.2.12")
    }

    const workbench = readJson("apps/matriz-workbench/package.json")
    const workbenchDependencies = workbench.dependencies as Record<string, string>
    expect(workbenchDependencies["@modelcontextprotocol/sdk"]).toBe("1.30.0")
  })
})
