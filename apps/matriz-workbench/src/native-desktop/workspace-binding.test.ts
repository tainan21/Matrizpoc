import { describe, expect, it } from "vitest"
import {
  resolveNativeWorkspaceBinding,
  type NativeWorkspaceBindingStore,
} from "./workspace-binding"

function store(initial?: string): NativeWorkspaceBindingStore & { written: string[] } {
  let value = initial
  const written: string[] = []
  return {
    written,
    async read() { return value },
    async write(root) { value = root; written.push(root) },
  }
}

describe("native workspace binding", () => {
  it("returns and persists the canonical physical workspace path", async () => {
    const bindingStore = store()
    const result = await resolveNativeWorkspaceBinding({
      bindingStore,
      pickFolder: async () => "C:\\junction",
      canonicalizeRoot: async () => "C:\\physical",
      validateRoot: async (root) => root === "C:\\physical",
    })
    expect(result).toEqual({ root: "C:\\physical", source: "picker" })
    expect(bindingStore.written).toEqual(["C:\\physical"])
  })
  it("uses a validated Control root before any local persisted or picker source", async () => {
    const bindingStore = store("C:\\persisted")
    const result = await resolveNativeWorkspaceBinding({
      controlRoot: "C:\\control",
      bindingStore,
      validateRoot: async (root) => root === "C:\\control",
      pickFolder: async () => { throw new Error("picker must not run") },
    })

    expect(result).toEqual({ root: "C:\\control", source: "control" })
    expect(bindingStore.written).toEqual([])
  })

  it("uses a valid machine-local binding without exposing a browser-selected path", async () => {
    const bindingStore = store("C:\\persisted")
    const result = await resolveNativeWorkspaceBinding({
      bindingStore,
      validateRoot: async (root) => root === "C:\\persisted",
      pickFolder: async () => { throw new Error("picker must not run") },
    })

    expect(result).toEqual({ root: "C:\\persisted", source: "persisted" })
    expect(bindingStore.written).toEqual([])
  })

  it("persists only a validated folder chosen by the native picker", async () => {
    const bindingStore = store("C:\\invalid")
    const result = await resolveNativeWorkspaceBinding({
      bindingStore,
      validateRoot: async (root) => root === "C:\\picked",
      pickFolder: async () => "C:\\picked",
    })

    expect(result).toEqual({ root: "C:\\picked", source: "picker" })
    expect(bindingStore.written).toEqual(["C:\\picked"])
  })

  it("rejects an invalid folder selected by the native picker", async () => {
    await expect(resolveNativeWorkspaceBinding({
      bindingStore: store(),
      validateRoot: async () => false,
      pickFolder: async () => "C:\\not-a-matriz-repository",
    })).rejects.toThrow("pasta selecionada não é um workspace Matriz válido")
  })
})
