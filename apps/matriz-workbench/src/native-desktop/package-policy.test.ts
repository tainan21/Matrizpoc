import { describe, expect, it } from "vitest"
import { assertPackagedWorkbenchPath, isPackagedWorkbenchPath } from "./package-policy"

describe("Workbench desktop package policy", () => {
  it("allows only the Electron runtime and traced Next runtime/static assets", () => {
    expect(isPackagedWorkbenchPath("dist/native-desktop/main.js")).toBe(true)
    expect(isPackagedWorkbenchPath(".next/standalone/apps/matriz-workbench/server.js")).toBe(true)
    expect(isPackagedWorkbenchPath(".next/static/chunks/app.js")).toBe(true)
    expect(isPackagedWorkbenchPath("public/logo.svg")).toBe(true)
  })

  it("rejects workspace data, secrets, source, documents, logs and caches", () => {
    for (const candidate of [
      ".matriz/activity/2026-08.jsonl",
      ".env.production",
      "src/domain/work-item.ts",
      "docs/AGENT-START-HERE.md",
      ".next/cache/webpack/client.bin",
      "logs/workbench.log",
    ]) {
      expect(() => assertPackagedWorkbenchPath(candidate)).toThrow("não pode entrar no pacote desktop")
    }
  })
})
