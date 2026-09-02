import { mkdir, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { mkdtemp, rm } from "node:fs/promises"
import { afterEach, describe, expect, it } from "vitest"

import { LegacyImportService } from "./legacy-import-service.js"
import type { BrowserSnapshot } from "../src/shared.js"

const roots: string[] = []
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))))

describe("LegacyImportService", () => {
  it("requires a one-use preview, preserves a backup and rolls back", async () => {
    const root = await mkdtemp(join(tmpdir(), "naevia-import-")); roots.push(root)
    const userData = join(root, "naevia")
    const legacyRoot = join(root, "Matriz Control Electron")
    const database = join(legacyRoot, "runtime", "vault", "browser.sqlite")
    await mkdir(join(legacyRoot, "runtime", "vault"), { recursive: true })
    await writeFile(database, "fixture")
    let state = snapshot("Atual")
    const service = new LegacyImportService(userData, [legacyRoot], async (next) => { state = next }, async () => state, () => ({
      capsules: [{ id: "old", name: "Legado", policy: "human" }],
      tabs: [{ id: "tab", capsuleId: "old", title: "Matriz", url: "https://matriz.local", active: true }],
    }), () => 1_000)

    const preview = await service.preview()
    expect(preview).toMatchObject({ available: true, capsuleCount: 1, tabCount: 1 })
    const result = await service.confirm(preview.confirmationToken!)
    expect(result.canRollback).toBe(true)
    expect(state.capsules[0]?.name).toBe("Legado")
    await expect(service.confirm(preview.confirmationToken!)).rejects.toThrow("inválida ou expirada")
    await expect(readFile(database, "utf8")).resolves.toBe("fixture")

    await service.rollback()
    expect(state.capsules[0]?.name).toBe("Atual")
    expect((await service.status()).canRollback).toBe(false)
  })

  it("refuses a changed source after preview", async () => {
    const root = await mkdtemp(join(tmpdir(), "naevia-import-")); roots.push(root)
    const userData = join(root, "naevia")
    const legacyRoot = join(root, "legacy")
    const database = join(legacyRoot, "vault", "browser.sqlite")
    await mkdir(join(legacyRoot, "vault"), { recursive: true }); await writeFile(database, "a")
    const state = snapshot("Atual")
    const service = new LegacyImportService(userData, [legacyRoot], async () => undefined, async () => state, () => ({ capsules: [{ id: "old", name: "Legado", policy: "human" }], tabs: [] }))
    const preview = await service.preview()
    await writeFile(database, "arquivo alterado")
    await expect(service.confirm(preview.confirmationToken!)).rejects.toThrow("mudou")
  })

  it("keeps the prepared backup available when state replacement fails", async () => {
    const root = await mkdtemp(join(tmpdir(), "naevia-import-")); roots.push(root)
    const userData = join(root, "naevia"); const legacyRoot = join(root, "legacy")
    const database = join(legacyRoot, "vault", "browser.sqlite")
    await mkdir(join(legacyRoot, "vault"), { recursive: true }); await writeFile(database, "fixture")
    const state = snapshot("Atual")
    const service = new LegacyImportService(userData, [legacyRoot], async () => { throw new Error("write failed") }, async () => state, () => ({ capsules: [{ id: "old", name: "Legado", policy: "human" }], tabs: [] }))
    const preview = await service.preview()
    await expect(service.confirm(preview.confirmationToken!)).rejects.toThrow("write failed")
    expect((await service.status()).canRollback).toBe(true)
  })
})

function snapshot(name: string): BrowserSnapshot {
  return { capsules: [{ id: "00000000-0000-0000-0000-000000000001", name, policy: "human" }], tabs: [{ id: "00000000-0000-0000-0000-000000000002", capsuleId: "00000000-0000-0000-0000-000000000001", title: "Nova", url: "https://duckduckgo.com", active: true, loading: false }], activeCapsuleId: "00000000-0000-0000-0000-000000000001", activeTabId: "00000000-0000-0000-0000-000000000002" }
}
