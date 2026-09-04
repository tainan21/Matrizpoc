import { describe, expect, it, vi } from "vitest"

import { openControlStore } from "./control-store-handoff.js"

describe("Control Store handoff", () => {
  it("opens only the fixed per-user Matriz Control executable", async () => {
    const openPath = vi.fn().mockResolvedValue("")

    await expect(openControlStore("C:\\Users\\tester\\AppData\\Local", openPath)).resolves.toEqual({ opened: true })
    expect(openPath).toHaveBeenCalledWith("C:\\Users\\tester\\AppData\\Local\\Matriz Control\\matriz-control.exe")
  })

  it("fails clearly when Control is not installed", async () => {
    await expect(openControlStore("C:\\Users\\tester\\AppData\\Local", vi.fn().mockResolvedValue("not found")))
      .rejects.toThrow("Matriz Control não está instalado")
  })
})
