import { describe, expect, it } from "vitest"
import { soundCatalog, soundRegistry } from "@matriz/design-ui/sounds"

import { toSoundCatalogPageViewModel, toSoundPackViewModels } from "./presenters"

describe("sound catalog presenters", () => {
  it("presents useful metrics and human labels", () => {
    const viewModel = toSoundCatalogPageViewModel(soundCatalog, soundRegistry.listPacks())

    expect(viewModel.summary).toEqual({ total: 12, available: 12, categories: 5, packs: 1 })
    expect(viewModel.items.find(({ id }) => id === "system.start")).toMatchObject({
      categoryLabel: "Sistema",
      statusLabel: "Disponível",
      assetFile: "system-start.wav",
      defaultVolumeLabel: "70%",
    })
  })

  it("serializes pack membership for the client boundary", () => {
    expect(toSoundPackViewModels(soundRegistry.listPacks())[0]).toMatchObject({
      id: "matriz-default",
      name: "Matriz Default",
      soundIds: expect.arrayContaining(["notification", "system.end"]),
    })
  })
})
