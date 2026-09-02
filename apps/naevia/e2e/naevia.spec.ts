import { _electron as electron, expect, test } from "@playwright/test"
import { mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

test("opens the real Electron shell with secure browser chrome", async () => {
  const profile = await mkdtemp(join(tmpdir(), "naevia-e2e-"))
  const application = await electron.launch({ args: ["."], cwd: process.cwd(), env: { ...process.env, NAEVIA_USER_DATA_DIR: profile } })
  try {
    await application.firstWindow()
    await expect.poll(() => application.windows().map((candidate) => candidate.url())).toContainEqual(expect.stringMatching(/\/dist\/index\.html$/))
    const window = application.windows().find((candidate) => /\/dist\/index\.html$/.test(candidate.url()))
    if (!window) throw new Error("Janela principal do NAEVIA não foi encontrada")
    await expect(window.getByLabel("NAEVIA")).toBeVisible()
    await expect(window.getByLabel("Pesquisar ou digitar endereço")).toHaveValue("https://duckduckgo.com/")
    await expect(window.getByRole("button", { name: "Nova aba" })).toBeVisible()
    await window.getByRole("button", { name: "Store" }).click()
    await expect(window.getByRole("heading", { name: "Matriz Store" })).toBeVisible()
    await window.getByRole("button", { name: "Terminal" }).click()
    await expect(window.getByText("Nenhuma sessão aberta.")).toBeVisible()
  } finally {
    await application.close()
  }
})
