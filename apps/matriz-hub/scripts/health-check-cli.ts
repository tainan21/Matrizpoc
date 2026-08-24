import type { HealthCheckKind, HealthCheckRunResult } from "../src/domains/health-checks/domain"
import { createHealthCheckRuntime } from "../src/domains/health-checks/runtime"
import { executeHealthCheck } from "../src/domains/health-checks/application"

function readEnvironment(args: readonly string[], fallback: string): string {
  const index = args.indexOf("--environment")
  if (index === -1) return fallback
  const value = args[index + 1]
  if (!value) throw new Error("Informe um ambiente após --environment.")
  return value
}

function printResult(result: HealthCheckRunResult): void {
  const label = result.kind === "routes" ? "ROUTE CHECK" : "API CHECK"
  console.log(`\n${label} · ${result.environment}`)
  console.log(`Total: ${result.summary.total}`)
  console.log(`Testadas: ${result.summary.tested}`)
  console.log(`OK: ${result.summary.ok}`)
  console.log(`Falhas: ${result.summary.failures}`)
  console.log(`Duração: ${result.durationMs}ms`)

  for (const failure of result.results.filter((item) => !item.success)) {
    const status = failure.statusHttp === null ? "sem resposta" : `HTTP ${failure.statusHttp}`
    console.error(
      `- ${failure.project} · ${failure.method} ${failure.route} · ${status} · ${failure.category}: ${failure.error}`,
    )
  }
  if (result.persistenceWarning) console.warn(result.persistenceWarning)
}

export async function runHealthCheckCli(kind: HealthCheckKind): Promise<void> {
  const runtime = await createHealthCheckRuntime()
  const defaultEnvironment = runtime.profiles[0]?.name
  if (!defaultEnvironment) throw new Error("Nenhum ambiente de health check configurado.")
  const environment = readEnvironment(process.argv.slice(2), defaultEnvironment)
  const result = await executeHealthCheck(kind, environment, runtime)
  printResult(result)
  if (result.summary.failures > 0) process.exitCode = 1
}
