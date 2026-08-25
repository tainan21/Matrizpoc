import { readFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  getOrCreateSchemaClient,
  type PrismaClientConstructor,
} from "../../packages/platform/db/src/client-runtime"

const root = process.cwd()
const schemas = ["core", "hub", "spot", "seumei", "contracts", "willdash"] as const
const entrypoints = {
  core: () => import("../../packages/platform/db/src/core"),
  hub: () => import("../../packages/platform/db/src/hub"),
  spot: () => import("../../packages/platform/db/src/spot"),
  seumei: () => import("../../packages/platform/db/src/seumei"),
  contracts: () => import("../../packages/platform/db/src/contracts"),
  willdash: () => import("../../packages/platform/db/src/willdash"),
} as const

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  for (const schema of schemas) {
    delete (globalThis as Record<string, unknown>)[`__test${schema}Db__`]
  }
})

describe("Prisma client ownership", () => {
  it("does not construct any schema client while entrypoints are imported", async () => {
    const singletonKeys = schemas.map(
      (schema) =>
        `__matriz${schema[0]!.toUpperCase()}${schema.slice(1)}Db__`,
    )

    const modules = await Promise.all(schemas.map((schema) => entrypoints[schema]()))

    for (const key of singletonKeys) {
      expect(Object.prototype.hasOwnProperty.call(globalThis, key)).toBe(false)
    }
    for (const module of modules) expect(module).not.toHaveProperty("PrismaClient")
  })

  it.each(schemas)("enforces runtime isolation and singleton behavior for %s", (schema) => {
    const environmentName = `${schema.toUpperCase()}_DATABASE_URL`
    const globalKey = `__test${schema}Db__`
    const constructedWith: unknown[] = []
    class FakeClient {
      constructor(options: unknown) {
        constructedWith.push(options)
      }
    }
    const options = {
      Client: FakeClient as PrismaClientConstructor<FakeClient>,
      environmentName,
      globalKey,
    }

    vi.stubEnv("DATABASE_URL", "postgresql://wrong-app")
    expect(() => getOrCreateSchemaClient(options)).toThrow(`Missing ${environmentName}`)
    expect(constructedWith).toHaveLength(0)

    vi.stubEnv(environmentName, `postgresql://${schema}-only`)
    const first = getOrCreateSchemaClient(options)
    const second = getOrCreateSchemaClient(options)
    expect(second).toBe(first)
    expect(constructedWith).toEqual([
      expect.objectContaining({
        datasources: { db: { url: `postgresql://${schema}-only` } },
      }),
    ])
    expect((globalThis as Record<string, unknown>)[globalKey]).toBe(first)
  })

  it("rejects browser use before invoking the generated constructor", () => {
    const Client = vi.fn()
    vi.stubGlobal("window", {})
    vi.stubEnv("CORE_DATABASE_URL", "postgresql://core-only")

    expect(() =>
      getOrCreateSchemaClient({
        Client: Client as unknown as PrismaClientConstructor<object>,
        environmentName: "CORE_DATABASE_URL",
        globalKey: "__testcoreDb__",
      }),
    ).toThrow("server-only")
    expect(Client).not.toHaveBeenCalled()
  })

  it.each(schemas)("exports one lazy, schema-isolated %s entrypoint", (schema) => {
    const packageJson = JSON.parse(
      readFileSync(join(root, "packages/platform/db/package.json"), "utf8"),
    ) as { exports: Record<string, string> }
    const source = readFileSync(
      join(root, "packages/platform/db/src", `${schema}.ts`),
      "utf8",
    )

    expect(packageJson.exports[`./${schema}`]).toBe(`./src/${schema}.ts`)
    expect(source).toContain(`.prisma/${schema}/index.js`)
    expect(source).toContain(`get${schema[0]!.toUpperCase()}${schema.slice(1)}Db`)
    expect(source).toContain(`${schema.toUpperCase()}_DATABASE_URL`)
    expect(source).not.toContain("process.env.DATABASE_URL")
    expect(source).not.toContain("postgresql://")
  })

  it("aggregates validation and generation for all six schemas", () => {
    const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
      scripts: Record<string, string>
    }

    for (const schema of schemas) {
      expect(packageJson.scripts["prisma:validate"]).toContain(`prisma:validate:${schema}`)
      expect(packageJson.scripts["prisma:generate"]).toContain(`prisma:generate:${schema}`)
    }
  })
})
