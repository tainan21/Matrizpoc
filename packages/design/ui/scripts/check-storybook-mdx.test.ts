import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { compile } from "@mdx-js/mdx"
import { describe, expect, it } from "vitest"

import { validateStorybookMdx } from "./check-storybook-mdx.mjs"

describe("Storybook MDX compiler", () => {
  it("rejects malformed MDX without requiring a fixture file", async () => {
    await expect(compile("<section>", { format: "mdx" })).rejects.toThrow()
  })

  it("fails validation for an invalid MDX document without a persistent fixture", async () => {
    const directory = await mkdtemp(join(tmpdir(), "matriz-storybook-mdx-"))
    await writeFile(join(directory, "invalid.mdx"), "<section>")

    await expect(validateStorybookMdx(directory)).rejects.toThrow()

    await rm(directory, { recursive: true, force: true })
  })
})
