import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

interface HealthPackage {
  readonly scripts: Record<string, string>
}

describe("Health runtime network boundary", () => {
  it.each(["dev", "start"])("binds the %s server explicitly to IPv4 loopback", (scriptName) => {
    const packageJson = JSON.parse(
      readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
    ) as HealthPackage

    expect(packageJson.scripts[scriptName]).toMatch(/(?:^|\s)-(?:H|-hostname)\s+127\.0\.0\.1(?:\s|$)/)
  })
})
