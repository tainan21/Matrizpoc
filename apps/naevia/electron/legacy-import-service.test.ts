import { mkdir, readFile, utimes, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { mkdtemp, rm } from "node:fs/promises"
import { afterEach, describe, expect, it } from "vitest"

import { LegacyImportService } from "./legacy-import-service.js"
import { BrowserRepository } from "./browser-repository.js"
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

  it("blocks preview and confirmation while the legacy application is open", async () => {
    let running = true
    const { service, current } = await importFixture(async () => {
      if (running) throw new Error("Feche o Matriz Control Electron antes de importar")
    })
    expect(await service.preview()).toMatchObject({ available: false, reason: expect.stringContaining("Feche") })
    running = false
    const preview = await service.preview()
    running = true
    await expect(service.confirm(preview.confirmationToken!)).rejects.toThrow("Feche")
    expect(current().capsules[0].name).toBe("Atual")
  })

  it("detects a same-size edit even when the original timestamp is restored", async () => {
    const { service, database, current } = await importFixture()
    const stamp = new Date("2020-01-01T00:00:00Z")
    await utimes(database, stamp, stamp)
    const preview = await service.preview()
    await writeFile(database, "changed")
    await utimes(database, stamp, stamp)
    await expect(service.confirm(preview.confirmationToken!)).rejects.toThrow("mudou")
    expect(current().capsules[0].name).toBe("Atual")
  })

  it("refuses a pending SQLite WAL without changing the target profile", async () => {
    const { service, database, current } = await importFixture()
    const preview = await service.preview()
    await writeFile(`${database}-wal`, "pending transaction")
    await expect(service.confirm(preview.confirmationToken!)).rejects.toThrow("pendente")
    expect(current().capsules[0].name).toBe("Atual")
  })

  it("refuses a corrupted rollback snapshot without replacing the active profile", async () => {
    const { service, current, userData } = await importFixture()
    const preview = await service.preview()
    await service.confirm(preview.confirmationToken!)
    const journal = JSON.parse(await readFile(join(userData, "legacy-import", "journal.json"), "utf8"))
    await writeFile(journal.backupPath, JSON.stringify({ version: 1, snapshot: null }))
    await expect(service.rollback()).rejects.toThrow()
    expect(current().capsules[0].name).toBe("Legado")
    expect((await service.status()).canRollback).toBe(false)
  })

  it("rejects rollback while an import is replacing the profile", async () => {
    let started!: () => void
    let release!: () => void
    const entered = new Promise<void>((resolve) => { started = resolve })
    const gate = new Promise<void>((resolve) => { release = resolve })
    let writes = 0
    const { service } = await importFixture(async () => undefined, async () => {
      if (++writes === 1) { started(); await gate }
    })
    const preview = await service.preview()
    const importing = service.confirm(preview.confirmationToken!)
    try {
      await entered
      await expect(service.rollback()).rejects.toThrow("andamento")
      expect(await service.preview()).toMatchObject({ available: false, reason: expect.stringContaining("andamento") })
    } finally { release(); await importing }
    expect((await service.status()).canRollback).toBe(true)
  })

  it("retains a recovery copy of the imported profile before rolling back", async () => {
    const { service, userData } = await importFixture()
    const preview = await service.preview()
    await service.confirm(preview.confirmationToken!)
    await service.rollback()
    const journal = JSON.parse(await readFile(join(userData, "legacy-import", "journal.json"), "utf8"))
    expect(typeof journal.replacedProfileBackup).toBe("string")
    const backup = JSON.parse(await readFile(journal.replacedProfileBackup, "utf8"))
    expect(backup.snapshot.capsules[0].name).toBe("Legado")
  })

  it("does not overwrite an outstanding recovery journal with another import", async () => {
    const { service, userData } = await importFixture()
    const preview = await service.preview()
    await service.confirm(preview.confirmationToken!)
    const journalPath = join(userData, "legacy-import", "journal.json")
    const originalJournal = await readFile(journalPath, "utf8")
    expect(await service.preview()).toMatchObject({ available: false, reason: expect.stringContaining("rollback") })
    expect(await readFile(journalPath, "utf8")).toBe(originalJournal)
  })

  it("aborts a stale import without replacing a browsing edit made after backup", async () => {
    const root = await mkdtemp(join(tmpdir(), "naevia-import-")); roots.push(root)
    const legacyRoot = join(root, "legacy")
    await mkdir(join(legacyRoot, "vault"), { recursive: true })
    await writeFile(join(legacyRoot, "vault", "browser.sqlite"), "fixture")
    const userData = join(root, "naevia")
    const repository = new BrowserRepository(join(userData, "browser-state.json"))
    let checks = 0
    const service = new LegacyImportService(userData, [legacyRoot], (next, expected) => repository.replace(next, expected),
      () => repository.snapshot(), () => ({ capsules: [{ id: "old", name: "Legado", policy: "human" }], tabs: [] }), Date.now,
      async () => { if (++checks === 3) await repository.mutate((state) => { state.capsules[0] = { ...state.capsules[0], name: "Edição recente" } }) })
    const preview = await service.preview()
    checks = 0
    await expect(service.confirm(preview.confirmationToken!)).rejects.toThrow("mudou")
    expect((await repository.snapshot()).capsules[0].name).toBe("Edição recente")
    expect((await service.status()).canRollback).toBe(false)
    expect((await service.preview()).available).toBe(true)
  })
})

async function importFixture(assertClosed: () => Promise<void> = async () => undefined, onReplace: () => Promise<void> = async () => undefined) {
  const root = await mkdtemp(join(tmpdir(), "naevia-import-")); roots.push(root)
  const legacyRoot = join(root, "legacy")
  const database = join(legacyRoot, "vault", "browser.sqlite")
  await mkdir(join(legacyRoot, "vault"), { recursive: true })
  await writeFile(database, "fixture")
  let state = snapshot("Atual")
  const userData = join(root, "naevia")
  const service = new LegacyImportService(userData, [legacyRoot], async (next) => { await onReplace(); state = next }, async () => state,
    () => ({ capsules: [{ id: "old", name: "Legado", policy: "human" }], tabs: [] }), Date.now, assertClosed)
  return { service, database, userData, current: () => state }
}

function snapshot(name: string): BrowserSnapshot {
  return { capsules: [{ id: "00000000-0000-0000-0000-000000000001", name, policy: "human" }], tabs: [{ id: "00000000-0000-0000-0000-000000000002", capsuleId: "00000000-0000-0000-0000-000000000001", title: "Nova", url: "https://duckduckgo.com", active: true, loading: false }], activeCapsuleId: "00000000-0000-0000-0000-000000000001", activeTabId: "00000000-0000-0000-0000-000000000002" }
}
