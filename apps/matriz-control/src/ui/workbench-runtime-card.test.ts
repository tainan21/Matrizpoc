import { describe, expect, it } from "vitest"
import { presentWorkbenchRuntime } from "./workbench-runtime-card"

describe("Workbench runtime presentation", () => {
  it("provides textual labels and safe actions for every runtime state", () => {
    expect(presentWorkbenchRuntime("stopped")).toMatchObject({ label: "Parado", canOpen: true, canRestart: false })
    expect(presentWorkbenchRuntime("starting")).toMatchObject({ label: "Iniciando", canOpen: false })
    expect(presentWorkbenchRuntime("ready")).toMatchObject({ label: "Disponível", canOpen: true, canRestart: true })
    expect(presentWorkbenchRuntime("failed")).toMatchObject({ label: "Falhou", canOpen: true, canRestart: true })
    expect(presentWorkbenchRuntime("incompatible")).toMatchObject({ label: "Versão incompatível", canOpen: false, canRestart: true })
  })
})
