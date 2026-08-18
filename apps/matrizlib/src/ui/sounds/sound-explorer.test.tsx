import "@testing-library/jest-dom/vitest"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { soundCatalog, soundRegistry, type SoundSystem, type SoundSystemState } from "@matriz/design-ui/sounds"

import { toSoundPackViewModels } from "../../sounds/presenters"
import { SoundExplorer } from "./sound-explorer"

afterEach(cleanup)

function createFakeSoundSystem() {
  let state: SoundSystemState = {
    enabled: true,
    muted: false,
    volume: 0.7,
    packId: "matriz-default",
    initialized: true,
  }
  const listeners = new Set<(next: SoundSystemState) => void>()
  const publish = (patch: Partial<SoundSystemState>) => {
    state = { ...state, ...patch }
    listeners.forEach((listener) => listener(state))
  }
  const system: SoundSystem = {
    initialize: vi.fn(async () => undefined),
    play: vi.fn(async (id) => {
      publish({ playingId: id })
      return { status: "played" as const, id }
    }),
    stop: vi.fn(() => publish({ playingId: undefined })),
    enable: vi.fn(() => publish({ enabled: true })),
    disable: vi.fn(() => publish({ enabled: false, playingId: undefined })),
    mute: vi.fn(() => publish({ muted: true, playingId: undefined })),
    unmute: vi.fn(() => publish({ muted: false })),
    setVolume: vi.fn((volume) => publish({ volume })),
    getVolume: () => state.volume,
    isEnabled: () => state.enabled,
    isMuted: () => state.muted,
    setPack: vi.fn((packId) => publish({ packId })),
    getPack: () => state.packId,
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
  return system
}

describe("SoundExplorer", () => {
  it("filters the 12 semantic sounds and exposes pack filtering", () => {
    render(
      <SoundExplorer entries={soundCatalog} packs={toSoundPackViewModels(soundRegistry.listPacks())} soundSystem={createFakeSoundSystem()} />,
    )

    expect(screen.getAllByRole("listitem")).toHaveLength(12)
    fireEvent.change(screen.getByLabelText("Buscar sons"), { target: { value: "pedido" } })
    expect(screen.getAllByRole("listitem")).toHaveLength(1)
    expect(screen.getByRole("heading", { name: "Pedido" })).toBeVisible()
    expect(screen.getByText("1 som", { selector: ".catalog-results-count" })).toBeVisible()

    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }))
    fireEvent.change(screen.getByLabelText("Categoria"), { target: { value: "system" } })
    expect(screen.getAllByRole("listitem")).toHaveLength(2)
    expect(screen.getByLabelText("Pack")).toHaveValue("all")
  })

  it("controls global preferences and one active preview", async () => {
    const soundSystem = createFakeSoundSystem()
    render(
      <SoundExplorer entries={soundCatalog} packs={toSoundPackViewModels(soundRegistry.listPacks())} soundSystem={soundSystem} />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Desativar áudio" }))
    expect(soundSystem.disable).toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: "Ativar áudio" }))
    expect(soundSystem.enable).toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "Silenciar sons" }))
    expect(soundSystem.mute).toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: "Restaurar sons" }))

    fireEvent.change(screen.getByLabelText("Volume global"), { target: { value: "35" } })
    expect(soundSystem.setVolume).toHaveBeenCalledWith(0.35)

    const notification = screen.getByRole("heading", { name: "Notificação" }).closest("li")!
    fireEvent.click(within(notification).getByRole("button", { name: "Ouvir Notificação" }))
    expect(await within(notification).findByRole("button", { name: "Parar Notificação" })).toBeVisible()
    fireEvent.click(within(notification).getByRole("button", { name: "Parar Notificação" }))
    expect(soundSystem.stop).toHaveBeenCalled()
  })
})
