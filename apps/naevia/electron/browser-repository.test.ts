import { mkdtemp, mkdir, readFile, readdir, rm, rmdir, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { randomUUID } from "node:crypto"
import { tmpdir } from "node:os"
import { afterEach, describe, expect, it } from "vitest"
import { BrowserRepository } from "./browser-repository.js"

const roots: string[] = []
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "naevia-repository-"))
  roots.push(root)
  const path = join(root, "browser-state.json")
  return { path, repository: new BrowserRepository(path) }
}

describe("BrowserRepository", () => {
  it("uses one initial identity and preserves every concurrent mutation on disk", async () => {
    const { path, repository } = await fixture()
    const [first, second] = await Promise.all([repository.snapshot(), repository.snapshot()])
    expect(first.activeCapsuleId).toBe(second.activeCapsuleId)
    await Promise.all(["One", "Two", "Three"].map((name) => repository.mutate((state) => {
      const id = randomUUID()
      state.capsules.push({ id, name, policy: "human" })
      state.tabs.push({ id: randomUUID(), capsuleId: id, title: name, url: "https://example.com/", active: false, loading: false })
    })))
    expect((await repository.snapshot()).capsules.map(({ name }) => name)).toEqual(["Pessoal", "One", "Two", "Three"])
    expect(JSON.parse(await readFile(path, "utf8")).snapshot.capsules.map((capsule: { name: string }) => capsule.name)).toEqual(["Pessoal", "One", "Two", "Three"])
  })

  it("keeps the committed state after a write failure and accepts the next mutation", async () => {
    const { path, repository } = await fixture()
    const original = await repository.snapshot()
    await mkdir(path)
    await expect(repository.mutate((state) => { state.capsules[0] = { ...state.capsules[0], name: "Lost" } })).rejects.toThrow()
    expect(await repository.snapshot()).toEqual(original)
    await rmdir(path)
    await repository.mutate((state) => { state.capsules[0] = { ...state.capsules[0], name: "Saved" } })
    expect((await new BrowserRepository(path).snapshot()).capsules[0].name).toBe("Saved")
  })

  it("recovers malformed state without losing the original bytes", async () => {
    const { path, repository } = await fixture()
    const damaged = JSON.stringify({ version: 1, snapshot: { capsules: null, tabs: [] } })
    await writeFile(path, damaged)
    const recovered = await repository.snapshot()
    expect(recovered.capsules[0]?.name).toBe("Pessoal")
    const backups = (await readdir(dirname(path))).filter((name) => name.startsWith("browser-state.json.corrupt-"))
    expect(backups).toHaveLength(1)
    expect(await readFile(join(dirname(path), backups[0]), "utf8")).toBe(damaged)
    await repository.mutate((state) => { state.capsules[0] = { ...state.capsules[0], name: "Recuperado" } })
    expect((await new BrowserRepository(path).snapshot()).capsules[0].name).toBe("Recuperado")
  })

  it("refuses an invalid replacement without touching the saved profile", async () => {
    const { path, repository } = await fixture()
    await repository.mutate(() => undefined)
    const original = await readFile(path, "utf8")
    const snapshot = await repository.snapshot()
    await expect(repository.replace({ ...snapshot, activeTabId: randomUUID() })).rejects.toThrow()
    expect(await readFile(path, "utf8")).toBe(original)
    expect(await repository.snapshot()).toEqual(snapshot)
  })

  it("rejects non-web URLs and duplicate identities before committing a mutation", async () => {
    const { repository } = await fixture()
    const original = await repository.snapshot()
    await expect(repository.mutate((state) => { state.tabs[0] = { ...state.tabs[0], url: "file:///C:/private.txt" } })).rejects.toThrow()
    await expect(repository.mutate((state) => { state.capsules.push(state.capsules[0]) })).rejects.toThrow()
    expect(await repository.snapshot()).toEqual(original)
  })
})
