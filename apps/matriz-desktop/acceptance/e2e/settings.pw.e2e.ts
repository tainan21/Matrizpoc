import { readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import type { Page } from "@playwright/test"

import { chooseMode } from "../playwright/actions"
import { expect, test } from "../playwright/fixtures"

test("recovers defaults from corrupt settings without destroying the source", async ({ tauriApp }) => {
  const { page, configDirectory } = tauriApp
  const path = join(configDirectory, "settings.json")
  const corrupt = "{ definitely-not-valid-json"
  await writeFile(path, corrupt)

  const settings = await invoke<Record<string, unknown>>(page, "read_settings")
  expect(settings).toMatchObject({ theme: "matriz", closeToTray: true, soundsEnabled: true, volume: 0.45, startWithWindows: false, terminalDockOpen: false, terminalDockHeight: 280 })
  expect(await readFile(path, "utf8")).toBe(corrupt)
  await chooseMode(page, "Hub")
  await expect(page.locator("main h1")).toHaveText("MATRIZ HUB")
})

function invoke<T>(page: Page, command: string): Promise<T> {
  return page.evaluate((name) => (window as unknown as { __TAURI_INTERNALS__: { invoke<TValue>(command: string): Promise<TValue> } }).__TAURI_INTERNALS__.invoke<T>(name), command)
}
