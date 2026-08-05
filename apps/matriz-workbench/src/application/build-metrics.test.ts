import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { collectStaticAssetMetrics } from "./build-metrics"

const roots: string[] = []

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})

describe("static asset metrics", () => {
  it("measures browser assets without reading source files", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "matriz-build-metrics-"))
    roots.push(root)
    const chunks = path.join(root, ".next", "static", "chunks")
    await mkdir(chunks, { recursive: true })
    await writeFile(path.join(chunks, "app.js"), "a".repeat(120))
    await writeFile(path.join(chunks, "app.css"), "b".repeat(30))
    await writeFile(path.join(root, ".next", "static", "ignored.txt"), "secret")

    await expect(collectStaticAssetMetrics(root)).resolves.toEqual({
      available: true,
      totalBytes: 150,
      javascriptBytes: 120,
      cssBytes: 30,
      fileCount: 2,
      largestAsset: { path: "chunks/app.js", bytes: 120 },
    })
  })

  it("reports an unavailable build without failing health", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "matriz-no-build-"))
    roots.push(root)

    await expect(collectStaticAssetMetrics(root)).resolves.toMatchObject({
      available: false,
      totalBytes: 0,
      fileCount: 0,
    })
  })
})
