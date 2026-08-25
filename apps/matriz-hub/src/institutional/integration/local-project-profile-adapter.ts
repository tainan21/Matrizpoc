import { readFile, readdir, stat } from "node:fs/promises"
import path from "node:path"

export interface LocalProjectProfile {
  projectId: string
  appId: string
  packageName?: string
  availability: "available" | "unavailable" | "invalid"
  commands: Partial<Record<"dev" | "lint" | "typecheck" | "test" | "build", string>>
  documentation: Array<{
    kind: "readme" | "agent-guide" | "adr"
    path: string
  }>
  localUrl?: string
  error?: string
}

export interface ReadLocalProjectProfileInput {
  repositoryRoot: string
  appId: string
  projectId: string
  localUrl?: string
}

interface PackageJson {
  name?: unknown
  scripts?: unknown
}

const APP_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/
const SUPPORTED_COMMANDS = ["dev", "lint", "typecheck", "test", "build"] as const

async function isFile(filePath: string): Promise<boolean> {
  try {
    return (await stat(filePath)).isFile()
  } catch {
    return false
  }
}

export async function findMatrizRepositoryRoot(start: string): Promise<string> {
  let current = path.resolve(start)
  for (;;) {
    if (await isFile(path.join(current, "pnpm-workspace.yaml"))) return current
    const parent = path.dirname(current)
    if (parent === current) {
      throw new Error("Matriz workspace root was not found.")
    }
    current = parent
  }
}

export async function readLocalProjectProfile(
  input: ReadLocalProjectProfileInput,
): Promise<LocalProjectProfile> {
  if (!APP_ID_PATTERN.test(input.appId)) {
    return {
      projectId: input.projectId,
      appId: input.appId,
      availability: "invalid",
      commands: {},
      documentation: [],
      error: "Invalid app identifier.",
    }
  }

  const relativeRoot = path.join("apps", input.appId)
  const appRoot = path.resolve(input.repositoryRoot, relativeRoot)
  const packageFile = path.join(appRoot, "package.json")
  if (!(await isFile(packageFile))) {
    return {
      projectId: input.projectId,
      appId: input.appId,
      availability: "unavailable",
      commands: {},
      documentation: [],
      ...(input.localUrl ? { localUrl: input.localUrl } : {}),
    }
  }

  try {
    const parsed = JSON.parse(await readFile(packageFile, "utf8")) as PackageJson
    const packageName = typeof parsed.name === "string" ? parsed.name : undefined
    const scripts =
      parsed.scripts && typeof parsed.scripts === "object"
        ? (parsed.scripts as Record<string, unknown>)
        : {}
    const commands: LocalProjectProfile["commands"] = {}
    if (packageName) {
      for (const command of SUPPORTED_COMMANDS) {
        if (typeof scripts[command] === "string") {
          commands[command] = `pnpm --filter ${packageName} ${command}`
        }
      }
    }

    const documentation: LocalProjectProfile["documentation"] = []
    const candidates = [
      { kind: "readme" as const, relative: path.join(relativeRoot, "README.md") },
      {
        kind: "agent-guide" as const,
        relative: path.join(relativeRoot, "docs", "AGENT-START-HERE.md"),
      },
    ]
    for (const candidate of candidates) {
      if (await isFile(path.join(input.repositoryRoot, candidate.relative))) {
        documentation.push({
          kind: candidate.kind,
          path: candidate.relative.replaceAll("\\", "/"),
        })
      }
    }
    const docsRoot = path.join(appRoot, "docs")
    const adrNames = await readdir(docsRoot)
      .then((names) => names.filter((name) => /^ADR[-_].+\.md$/i.test(name)).sort())
      .catch(() => [])
    for (const name of adrNames.slice(0, 100)) {
      documentation.push({
        kind: "adr",
        path: path.join(relativeRoot, "docs", name).replaceAll("\\", "/"),
      })
    }

    return {
      projectId: input.projectId,
      appId: input.appId,
      ...(packageName ? { packageName } : {}),
      availability: "available",
      commands,
      documentation,
      ...(input.localUrl ? { localUrl: input.localUrl } : {}),
    }
  } catch {
    return {
      projectId: input.projectId,
      appId: input.appId,
      availability: "invalid",
      commands: {},
      documentation: [],
      error: "package.json could not be parsed.",
    }
  }
}
