import { mkdtemp, mkdir, readFile, rm, rmdir } from "node:fs/promises"
import { join } from "node:path"
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
      state.capsules.push({ id: name, name, policy: "human" })
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
})
