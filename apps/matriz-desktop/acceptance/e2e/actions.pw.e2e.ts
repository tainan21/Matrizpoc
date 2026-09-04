import { mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { Page } from "@playwright/test"

import { chooseMode } from "../playwright/actions"
import { expect, test } from "../playwright/fixtures"
import { removeTemporaryRoot } from "../playwright/native-process"

test("degrades optional Doctor checks and rejects gates after workspace loss", async ({ tauriPage: page }) => {
  const root = await mkdtemp(join(tmpdir(), "matriz-actions-boundary-"))
  try {
    await Promise.all([
      writeFile(join(root, "package.json"), "{}"),
      writeFile(join(root, "pnpm-workspace.yaml"), "packages: []"),
    ])
    await invoke(page, "select_workspace", { path: root })

    await chooseMode(page, "Doctor")
    const workbench = page.locator(".doctor-check").filter({ hasText: "Matriz Workbench" })
    await expect(workbench).toContainText(/não encontrado|indisponível/i)
    await expect(workbench.locator(".status-dot")).toHaveClass(/degraded/)
    await chooseMode(page, "Portas")
    await expect(page.locator("main h1")).toHaveText("PORTAS")

    await removeTemporaryRoot({ root })
    await expect(invoke(page, "start_managed_operation", { operationId: "gate.typecheck" })).rejects.toThrow(/workspace|directory|path|unable/i)
    expect(await invoke<unknown[]>(page, "list_terminals")).toHaveLength(0)
  } finally {
    await removeTemporaryRoot({ root }).catch(() => undefined)
  }
})

function invoke<T>(page: Page, command: string, args?: Record<string, unknown>): Promise<T> {
  return page.evaluate(({ command, args }) => (window as unknown as { __TAURI_INTERNALS__: { invoke<TValue>(name: string, input?: Record<string, unknown>): Promise<TValue> } }).__TAURI_INTERNALS__.invoke<T>(command, args), { command, args })
}
