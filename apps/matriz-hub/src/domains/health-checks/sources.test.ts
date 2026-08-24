import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import {
  createRouteTargets,
  discoverApiTargets,
  findHealthCheckWorkspaceRoot,
  loadHealthEnvironmentProfiles,
  type RegisteredHealthApp,
} from "./sources"

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) =>
    rm(directory, { recursive: true, force: true }),
  ))
})

function apps(): readonly RegisteredHealthApp[] {
  return [
    {
      appId: "matriz-hub",
      name: "MyHub",
      baseUrl: "http://localhost:3000",
      routes: ["/", "/health"],
    },
    {
      appId: "spot",
      name: "Spot",
      baseUrl: "http://localhost:3001",
      routes: ["/gigs"],
    },
  ]
}

describe("loadHealthEnvironmentProfiles", () => {
  it("derives the local profile and accepts allowlisted configured profiles", () => {
    const profiles = loadHealthEnvironmentProfiles(
      apps(),
      "development",
      JSON.stringify({ preview: { "matriz-hub": "https://hub.example.com" } }),
    )

    expect(profiles.map((profile) => profile.name)).toEqual(["development", "preview"])
    expect(profiles[1]?.baseUrls).toEqual({ "matriz-hub": "https://hub.example.com" })
  })

  it("rejects unknown apps and unsafe URL protocols", () => {
    expect(() => loadHealthEnvironmentProfiles(
      apps(),
      "development",
      JSON.stringify({ preview: { unknown: "https://example.com" } }),
    )).toThrow("app desconhecido")

    expect(() => loadHealthEnvironmentProfiles(
      apps(),
      "development",
      JSON.stringify({ preview: { spot: "file:///tmp/spot" } }),
    )).toThrow("HTTP ou HTTPS")
  })
})

describe("createRouteTargets", () => {
  it("uses only manifest routes from apps present in the selected profile", () => {
    const [local] = loadHealthEnvironmentProfiles(apps(), "development")
    const targets = createRouteTargets(apps(), local!)

    expect(targets).toHaveLength(3)
    expect(targets.map((item) => item.url)).toEqual([
      "http://localhost:3000/",
      "http://localhost:3000/health",
      "http://localhost:3001/gigs",
    ])
  })
})

describe("discoverApiTargets", () => {
  it("discovers exported methods and probes dynamic routes with OPTIONS", async () => {
    const workspaceRoot = await mkdtemp(path.join(tmpdir(), "myhub-health-"))
    temporaryDirectories.push(workspaceRoot)
    const staticDirectory = path.join(workspaceRoot, "apps", "matriz-hub", "app", "api", "status")
    const dynamicDirectory = path.join(workspaceRoot, "apps", "matriz-hub", "app", "api", "items", "[id]")
    const reexportDirectory = path.join(workspaceRoot, "apps", "matriz-hub", "app", "api", "alias")
    await Promise.all([
      mkdir(staticDirectory, { recursive: true }),
      mkdir(dynamicDirectory, { recursive: true }),
      mkdir(reexportDirectory, { recursive: true }),
    ])
    await writeFile(path.join(staticDirectory, "route.ts"), "export async function GET() {}")
    await writeFile(path.join(dynamicDirectory, "route.ts"), "export const GET = () => null")
    await writeFile(path.join(reexportDirectory, "route.ts"), "export { GET } from '../status/route'")

    const profile = {
      name: "development",
      baseUrls: { "matriz-hub": "http://localhost:3000" },
    }
    const targets = await discoverApiTargets(workspaceRoot, apps().slice(0, 1), profile)

    expect(targets.map(({ route, method, probeMode }) => ({ route, method, probeMode }))).toEqual([
      { route: "/api/alias", method: "GET", probeMode: "content" },
      { route: "/api/items/[id]", method: "OPTIONS", probeMode: "reachability" },
      { route: "/api/status", method: "GET", probeMode: "content" },
    ])
    expect(targets[1]?.url).toBe("http://localhost:3000/api/items/__healthcheck__")
  })
})

describe("findHealthCheckWorkspaceRoot", () => {
  it("walks upward until it finds the monorepo markers", async () => {
    const workspaceRoot = await mkdtemp(path.join(tmpdir(), "myhub-root-"))
    temporaryDirectories.push(workspaceRoot)
    const nested = path.join(workspaceRoot, "apps", "matriz-hub", "scripts")
    await mkdir(nested, { recursive: true })
    await writeFile(path.join(workspaceRoot, "pnpm-workspace.yaml"), "packages: []")

    expect(await findHealthCheckWorkspaceRoot(nested)).toBe(workspaceRoot)
  })
})
