import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import path from "node:path"
import type { HealthCheckKind, HealthCheckRunResult } from "./domain"

export interface HealthCheckResultRepository {
  save(result: HealthCheckRunResult): Promise<void>
  getLatest(kind: HealthCheckKind, environment: string): Promise<HealthCheckRunResult | null>
}

function assertSafeEnvironment(environment: string): void {
  if (!/^[a-z0-9][a-z0-9_-]{0,31}$/i.test(environment)) {
    throw new Error(`Ambiente inválido para persistência: ${environment}.`)
  }
}

function isHealthCheckResult(value: unknown): value is HealthCheckRunResult {
  if (!value || typeof value !== "object") return false
  const candidate = value as Partial<HealthCheckRunResult>
  return candidate.version === "myhub-health-check/v1" &&
    (candidate.kind === "routes" || candidate.kind === "apis") &&
    typeof candidate.environment === "string" &&
    Array.isArray(candidate.results) &&
    typeof candidate.summary === "object"
}

export function createFileHealthCheckResultRepository(
  workspaceRoot: string,
): HealthCheckResultRepository {
  const storageRoot = path.resolve(workspaceRoot, ".runtime", "myhub-health-checks")

  function resultPath(kind: HealthCheckKind, environment: string): string {
    assertSafeEnvironment(environment)
    return path.join(storageRoot, environment, `${kind}.latest.json`)
  }

  return {
    async save(result) {
      const destination = resultPath(result.kind, result.environment)
      await mkdir(path.dirname(destination), { recursive: true })
      const temporary = `${destination}.${process.pid}.${crypto.randomUUID()}.tmp`
      await writeFile(temporary, `${JSON.stringify(result, null, 2)}\n`, "utf8")
      await rename(temporary, destination)
    },
    async getLatest(kind, environment) {
      const source = resultPath(kind, environment)
      let content: string
      try {
        content = await readFile(source, "utf8")
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return null
        throw error
      }
      const parsed: unknown = JSON.parse(content)
      if (!isHealthCheckResult(parsed)) {
        throw new Error(`Resultado de health check inválido em ${source}.`)
      }
      return parsed
    },
  }
}
