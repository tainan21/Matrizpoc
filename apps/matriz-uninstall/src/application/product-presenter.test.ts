import { describe, expect, it } from "vitest"
import { presentProducts } from "./product-presenter"

const base = {
  displayName: "Matriz Control",
  platform: "win32" as const,
  arch: "x64" as const,
  state: "active" as const,
  release: null,
  windows: {
    displayName: "Matriz Control",
    publisher: "Matriz",
    executableName: "Matriz Control.exe",
    aliases: [],
  },
}

describe("product presenter", () => {
  it("shows both Control stacks independently and derives safe actions", () => {
    const view = presentProducts(
      [
        {
          ...base,
          productId: "matriz-control-tauri",
          edition: "Tauri",
          runtime: "tauri" as const,
          windows: { ...base.windows, uninstallKey: "Matriz Control" },
        },
        {
          ...base,
          productId: "matriz-control-electron",
          edition: "Electron",
          runtime: "electron" as const,
          windows: { ...base.windows, uninstallKey: "electron-guid" },
        },
      ],
      [
        {
          installationId: "tauri-install",
          registryKey: "Matriz Control",
          displayName: "Matriz Control",
          publisher: "Matriz",
          version: "0.1.0",
          installLocation: "C:\\Users\\user\\AppData\\Local\\Matriz Control",
          estimatedBytes: 2_500_000,
        },
        {
          installationId: "electron-install",
          registryKey: "electron-guid",
          displayName: "Matriz Control 0.1.0",
          publisher: "Matriz",
          version: "0.1.0",
          installLocation: "C:\\Users\\user\\AppData\\Local\\Programs\\Matriz Control",
          estimatedBytes: 200_000_000,
        },
      ],
    )

    expect(view.map(({ title }) => title)).toEqual([
      "Matriz Control · Tauri",
      "Matriz Control · Electron",
    ])
    expect(view.map(({ status }) => status)).toEqual(["installed", "installed"])
    expect(
      view.every(({ actions }) => actions.includes("uninstall") && actions.includes("reinstall")),
    ).toBe(true)
  })

  it("does not assign one historical installation to two editions through aliases", () => {
    const view = presentProducts(
      [
        {
          ...base,
          productId: "matriz-control-tauri",
          edition: "Tauri",
          runtime: "tauri" as const,
          windows: { ...base.windows, uninstallKey: "Matriz Control" },
        },
        {
          ...base,
          productId: "matriz-control-electron",
          edition: "Electron",
          runtime: "electron" as const,
          windows: {
            ...base.windows,
            displayName: "Matriz Control 0.1.0",
            uninstallKey: "electron-guid",
            aliases: ["Matriz Control"],
          },
        },
      ],
      [
        {
          installationId: "one-install",
          registryKey: "Registry::HKEY_CURRENT_USER\\Software\\Uninstall\\Matriz Control",
          displayName: "Matriz Control",
          publisher: "Matriz",
          version: "0.1.0",
          installLocation: "C:\\Matriz Control",
          estimatedBytes: 2_500_000,
        },
      ],
    )

    expect(view.map(({ status }) => status)).toEqual(["installed", "unavailable"])
  })
})
