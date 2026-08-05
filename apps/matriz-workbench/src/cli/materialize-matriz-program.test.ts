import { readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"
import { parseMatrizProgramCliMode } from "./materialize-matriz-program"

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
})
