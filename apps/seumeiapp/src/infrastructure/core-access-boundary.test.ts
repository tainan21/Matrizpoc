import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

describe("Seumei Core boundary", () => {
  it("does not import the Core database client", () => {
    const files = ["src/application/composition.ts", "scripts/provision-demo.ts"]
    for (const file of files) expect(readFileSync(resolve(process.cwd(), file), "utf8")).not.toMatch(/platform-db\/core|getCoreDb/)
  })
})
