import { mkdtemp, readFile, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { createNativeWorkspaceBindingStore } from "./workspace-binding-store"

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

describe("native workspace binding store", () => {
  it("persists only the machine-local workspace root in the supplied native user-data path", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "matriz-workbench-native-"))
    temporaryDirectories.push(directory)
    const target = path.join(directory, "user-data", "workspace-binding.json")
    const store = createNativeWorkspaceBindingStore(target)

    await store.write("C:\\Matriz")

    expect(await store.read()).toBe("C:\\Matriz")
    await expect(readFile(target, "utf8")).resolves.toBe('{"workspaceRoot":"C:\\\\Matriz"}\n')
  })

  it("ignores malformed or oversized persisted data", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "matriz-workbench-native-"))
    temporaryDirectories.push(directory)
    const target = path.join(directory, "workspace-binding.json")
    const store = createNativeWorkspaceBindingStore(target)
    await store.write("C:\\Matriz")
    await (await import("node:fs/promises")).writeFile(target, "x".repeat(2049))

    await expect(store.read()).resolves.toBeUndefined()
  })
})
