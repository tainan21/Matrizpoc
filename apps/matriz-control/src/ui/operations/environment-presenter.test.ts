import { describe, expect, it } from "vitest"
import { presentEnvironments } from "./environment-presenter"

describe("Environment presenter", () => {
  it("shows declared local metadata and store update state only", () => {
    const view = presentEnvironments([
      { id: "matriz-control", name: "matriz-control", version: "0.2.0", port: 3009, actions: [{ id: "dev", label: "Iniciar" }] },
      { id: "health", name: "health", version: null, port: null, actions: [] },
    ], "web")
    expect(view).toEqual([
      expect.objectContaining({ id: "matriz-control", version: "0.2.0", mode: "web", update: "Atualização via instalador indisponível no navegador" }),
      expect.objectContaining({ id: "health", version: "Versão não declarada", port: "Sem porta declarada" }),
    ])
    expect(presentEnvironments([{ id: "matriz-control", name: "matriz-control", version: "0.2.0", port: 3009, actions: [] }], "desktop")[0]).toMatchObject({ mode: "desktop", update: "Consultar atualização no desktop" })
  })
})
