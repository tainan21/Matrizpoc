import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const runtimeGate = await import("./check-storybook-runtime.mjs")
const packageJson = JSON.parse(
  await readFile(resolve(import.meta.dirname, "..", "package.json"), "utf8"),
) as { scripts: { lint: string } }

describe("Storybook runtime gate", () => {
  it("scans JavaScript module outputs in both supported extensions", () => {
    expect(runtimeGate.isJavaScriptModuleFile).toBeTypeOf("function")
    expect(runtimeGate.checkStorybookRuntime).toBeTypeOf("function")
    expect(runtimeGate.isJavaScriptModuleFile?.("iframe.js")).toBe(true)
    expect(runtimeGate.isJavaScriptModuleFile?.("catalog.mjs")).toBe(true)
    expect(runtimeGate.isJavaScriptModuleFile?.("catalog.css")).toBe(false)
  })

  it("keeps release-gate scripts inside the package lint scope", () => {
    expect(packageJson.scripts.lint).toContain("scripts")
  })
})
