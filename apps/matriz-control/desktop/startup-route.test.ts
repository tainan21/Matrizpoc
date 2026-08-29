import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const desktopDirectory = fileURLToPath(new URL(".", import.meta.url))

describe("Matriz Control desktop entry route", () => {
  it("opens the complete cockpit after the loopback server is ready", async () => {
    const [launcher, main] = await Promise.all([
      readFile(new URL("launch.mjs", `file://${desktopDirectory.replace(/\\/g, "/")}/`), "utf8"),
      readFile(new URL("main.ts", `file://${desktopDirectory.replace(/\\/g, "/")}/`), "utf8"),
    ])

    expect(launcher).toContain('MATRIZ_CONTROL_DESKTOP_URL: "http://127.0.0.1:3009/home"')
    expect(main).toContain('window.loadURL(process.env.MATRIZ_CONTROL_DESKTOP_URL ?? "http://127.0.0.1:3009/home")')
    expect(main).toContain('fetch("http://127.0.0.1:3009/home")')
  })
})
