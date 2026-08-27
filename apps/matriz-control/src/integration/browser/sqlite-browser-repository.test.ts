import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import type { BrowserTab, Capsule } from "../../domain/browser"
import { SqliteBrowserRepository } from "./sqlite-browser-repository"

const temporary: string[] = []
afterEach(async () => { await Promise.all(temporary.splice(0).map((path) => rm(path, { recursive: true, force: true }))) })

describe("SqliteBrowserRepository", () => {
  it("persists capsules and isolated tabs across repository restarts", async () => {
    const root = await mkdtemp(join(tmpdir(), "matriz-control-sqlite-")); temporary.push(root)
    const database = join(root, "browser.sqlite")
    const capsule: Capsule = { id: "capsule_1", name: "Testes", kind: "agent", policy: "agent-safe", searchProvider: { kind: "duckduckgo" }, cacheMode: "persistent", groupId: null }
    const tab: BrowserTab = { id: "tab_1", capsuleId: capsule.id, url: "https://example.com", title: "Example", status: "ready", pinnedLive: false, active: true, lastActiveAt: "2026-08-25T12:00:00.000Z" }

    const first = new SqliteBrowserRepository(database)
    await first.saveCapsule(capsule)
    await first.saveTab(tab)
    first.close()

    const reopened = new SqliteBrowserRepository(database)
    await expect(reopened.listCapsules()).resolves.toEqual([capsule])
    await expect(reopened.listTabs(capsule.id)).resolves.toEqual([tab])
    await reopened.deleteTab(tab.id)
    await expect(reopened.listTabs(capsule.id)).resolves.toEqual([])
    reopened.close()
  })
})
