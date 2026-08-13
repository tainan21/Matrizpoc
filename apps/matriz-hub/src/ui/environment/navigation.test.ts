import { describe, expect, it } from "vitest"
import {
  HUB_NAV_GROUPS,
  buildCommandItems,
  filterCommandItems,
  resolveActiveNavItem,
} from "./navigation"

describe("Hub operational navigation", () => {
  it("keeps primary existing surfaces unique and reachable", () => {
    const paths = HUB_NAV_GROUPS.flatMap((group) =>
      group.items.map((item) => item.href),
    )

    expect(new Set(paths).size).toBe(paths.length)
    expect(paths).toEqual(
      expect.arrayContaining([
        "/",
        "/projects",
        "/health",
        "/registry",
        "/architecture",
        "/ecosystem",
        "/events",
        "/telemetry",
        "/docs",
        "/praticies",
        "/roadmap",
        "/agents",
        "/releases",
      ]),
    )
  })

  it("selects the most specific navigation parent for nested routes", () => {
    expect(resolveActiveNavItem("/docs/context/ctx_1")?.href).toBe(
      "/docs/context",
    )
    expect(resolveActiveNavItem("/projects/matriz-hub")?.href).toBe(
      "/projects",
    )
  })

  it("builds searchable commands with their operational context", () => {
    expect(buildCommandItems(HUB_NAV_GROUPS)).toContainEqual(
      expect.objectContaining({
        href: "/telemetry",
        groupLabel: "Operação",
      }),
    )
  })

  it("finds commands without requiring accents or exact technical wording", () => {
    const commands = buildCommandItems(HUB_NAV_GROUPS)

    expect(filterCommandItems(commands, "saude").map((item) => item.href)).toContain(
      "/health",
    )
    expect(filterCommandItems(commands, "observabilidade").map((item) => item.href)).toContain(
      "/telemetry",
    )
  })
})
