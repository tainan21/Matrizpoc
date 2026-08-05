import { readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"
import { parseMatrizProgramCliMode, parseMatrizProgramPlanSource } from "./materialize-matriz-program"

describe("materialize Matriz program CLI", () => {
  it.each(["dry-run", "apply", "resume", "verify", "complete-item-2"] as const)(
    "accepts the explicit %s mode",
    (mode) => {
      expect(parseMatrizProgramCliMode(["--mode", mode])).toBe(mode)
    },
  )

  it("rejects missing or unknown modes", () => {
    expect(() => parseMatrizProgramCliMode([])).toThrow("Usage:")
    expect(() => parseMatrizProgramCliMode(["--mode", "write-json"])).toThrow("Usage:")
  })

  it("exposes the app-local package command", async () => {
    const packageJson = JSON.parse(await readFile(new URL("../../package.json", import.meta.url), "utf8")) as {
      scripts: Record<string, string>
    }
    expect(packageJson.scripts["materialize:matriz-program"]).toBe("tsx src/cli/materialize-matriz-program.ts")
  })

  it("loads the canonical raw manifest strictly before fingerprinting or writes", async () => {
    const source = await readFile(
      new URL("../application/plans/matriz-program-2026-08-05-v1.json", import.meta.url),
      "utf8",
    )
    expect(parseMatrizProgramPlanSource(source).items).toHaveLength(50)
    const adulterated = JSON.parse(source) as { items: Array<Record<string, unknown>> }
    adulterated.items[0].productStatus = "discovery"

    expect(() => parseMatrizProgramPlanSource(JSON.stringify(adulterated))).toThrow()
  })
})
