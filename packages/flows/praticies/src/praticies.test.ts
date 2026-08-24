import { describe, expect, it } from "vitest"
import {
  DEFAULT_PRACTICE_APPS,
  PraticiesService,
  createMemoryPraticiesRepository,
  normalizePraticiesState,
  reorderLayout,
} from "./index"

describe("Praticies workspace domain", () => {
  it("publishes a stable semantic icon key instead of exposing a visual glyph as identity", () => {
    expect(DEFAULT_PRACTICE_APPS.find((app) => app.id === "patterns")?.iconKey).toBe("folders")
  })

  it("normalizes unknown persisted state against the current catalog", () => {
    const state = normalizePraticiesState(
      {
        version: 1,
        installedIds: ["patterns", "missing", "patterns"],
        recent: [
          { appId: "missing", openedAt: "bad" },
          { appId: "patterns", openedAt: "2026-08-12T10:00:00.000Z" },
        ],
        layout: [
          { appId: "missing", size: "wide" },
          { appId: "patterns", size: "wide" },
        ],
      },
      DEFAULT_PRACTICE_APPS,
    )

    expect(state.installedIds).toEqual(["patterns"])
    expect(state.recent).toEqual([
      { appId: "patterns", openedAt: "2026-08-12T10:00:00.000Z" },
    ])
    expect(state.layout).toEqual([{ appId: "patterns", size: "wide" }])
  })

  it("installs idempotently and refuses preview utilities", () => {
    const repository = createMemoryPraticiesRepository()
    const service = new PraticiesService(repository, DEFAULT_PRACTICE_APPS)

    service.install("validation-recipes")
    service.install("validation-recipes")
    service.install("context-brief")

    expect(repository.load().installedIds).toContain("validation-recipes")
    expect(repository.load().installedIds.filter((id) => id === "validation-recipes")).toHaveLength(1)
    expect(repository.load().installedIds).not.toContain("context-brief")
  })

  it("uninstalls an app and removes only its layout card", () => {
    const repository = createMemoryPraticiesRepository()
    const service = new PraticiesService(repository, DEFAULT_PRACTICE_APPS)
    service.install("validation-recipes")
    service.uninstall("patterns")

    const state = repository.load()
    expect(state.installedIds).not.toContain("patterns")
    expect(state.layout.some((item) => item.appId === "patterns")).toBe(false)
    expect(state.installedIds).toContain("validation-recipes")
  })

  it("records unique recents in newest-first order and caps the list", () => {
    const repository = createMemoryPraticiesRepository()
    let minute = 0
    const service = new PraticiesService(
      repository,
      DEFAULT_PRACTICE_APPS,
      () => new Date(Date.UTC(2026, 7, 12, 10, minute++)),
      3,
    )

    service.recordOpen("patterns")
    service.recordOpen("project-compass")
    service.recordOpen("release-notes")
    service.recordOpen("patterns")

    expect(repository.load().recent.map((item) => item.appId)).toEqual([
      "patterns",
      "release-notes",
      "project-compass",
    ])
  })

  it("reorders cards without mutating their size", () => {
    const layout = [
      { appId: "patterns", size: "wide" as const },
      { appId: "project-compass", size: "compact" as const },
      { appId: "validation-recipes", size: "compact" as const },
    ]

    expect(reorderLayout(layout, "validation-recipes", "patterns")).toEqual([
      layout[2],
      layout[0],
      layout[1],
    ])
    expect(layout[0]?.appId).toBe("patterns")
  })
})
