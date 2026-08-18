import { describe, expect, it } from "vitest"
import { componentCatalog } from "./component-catalog"
import {
  toComponentCatalogDetailViewModel,
  toComponentCatalogPageViewModel,
} from "./presenters"

describe("catalog presenters", () => {
  it("presents deterministic portal counts and card view models", () => {
    const viewModel = toComponentCatalogPageViewModel(componentCatalog)

    expect(viewModel.summary).toEqual({
      total: 99,
      available: 14,
      candidates: 85,
      qualified: 17,
    })
    expect(viewModel.items[0]).toMatchObject({
      id: "C001",
      name: "Stack",
      href: "/components/stack",
      categoryLabel: "Layout",
      stageLabel: "Disponível",
      qualificationLabel: "Qualificado",
    })
    expect("packageMetadata" in viewModel.items[0]!).toBe(false)
  })

  it("presents a canonical import and flattened metadata for an available entry", () => {
    const button = componentCatalog.find((entry) => entry.id === "C011")!

    expect(toComponentCatalogDetailViewModel(button)).toMatchObject({
      id: "C011",
      importStatement: 'import { Button } from "@matriz/design-ui"',
      packageStatus: "stable",
      source: "actions.tsx",
      tags: ["action", "control"],
    })
  })

  it("does not invent package fields for a candidate", () => {
    const candidate = componentCatalog.find((entry) => entry.id === "C099")!
    const viewModel = toComponentCatalogDetailViewModel(candidate)

    expect(viewModel).toMatchObject({
      id: "C099",
      stageLabel: "Candidato",
      importStatement: undefined,
      packageStatus: undefined,
      source: undefined,
      tags: [],
      tokens: [],
      accessibility: [],
      related: [],
    })
    expect("packageMetadata" in viewModel).toBe(false)
  })
})
