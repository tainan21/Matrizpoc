import { mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { Page } from "@playwright/test"

import { chooseMode, selectAcceptanceWorkspace } from "../playwright/actions"
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

test("runs every fixed gate with evidence and interrupts only the selected gate", async ({ tauriPage: page }) => {
  await selectAcceptanceWorkspace(page)
  for (const gateId of ["typecheck", "lint", "test:smoke", "prisma:validate"]) {
    const result = await invoke<{ gateId: string; success: boolean; durationMs: number; output: string[] }>(page, "run_gate", { gateId })
    expect(result.gateId).toBe(gateId)
    expect(result.success, `${gateId}: ${result.output.join("\n")}`).toBe(true)
    expect(result.durationMs).toBeGreaterThan(0)
    expect(result.output.length).toBeGreaterThan(0)
  }

  const shell = await invoke<{ id: string; status: string }>(page, "create_terminal")
  const gate = await invoke<{ id: string; operationId: string; status: string }>(page, "start_managed_operation", { operationId: "gate.typecheck" })
  await expect(invoke(page, "start_managed_operation", { operationId: "gate.lint" })).rejects.toThrow(/another validation gate/i)
  await invoke(page, "interrupt_terminal", { sessionId: gate.id })
  await invoke(page, "close_terminal", { sessionId: gate.id })
  expect(await invoke<{ id: string; status: string }[]>(page, "list_terminals")).toContainEqual(expect.objectContaining({ id: shell.id, status: "running" }))
  await invoke(page, "close_terminal", { sessionId: shell.id })
})

function invoke<T>(page: Page, command: string, args?: Record<string, unknown>): Promise<T> {
  return page.evaluate(({ command, args }) => (window as unknown as { __TAURI_INTERNALS__: { invoke<TValue>(name: string, input?: Record<string, unknown>): Promise<TValue> } }).__TAURI_INTERNALS__.invoke<T>(command, args), { command, args })
}
