import type { HealthCheckRunResult, HealthFailureCategory } from "./domain"

const CATEGORY_LABELS: Readonly<Record<HealthFailureCategory, string>> = {
  endpoint_not_found: "Endpoint inexistente",
  server_error: "Erro de servidor",
  unauthorized: "Autenticação necessária",
  forbidden: "Acesso não autorizado",
  method_not_allowed: "Método não permitido",
  unexpected_response: "Resposta inesperada",
  timeout: "Timeout",
  network_error: "Erro de rede",
}

function durationLabel(durationMs: number): string {
  if (durationMs < 1_000) return `${durationMs} ms`
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(durationMs / 1_000)} s`
}

export interface HealthCheckFailureVM {
  readonly appId: string
  readonly project: string
  readonly route: string
  readonly url: string
  readonly method: string
  readonly statusLabel: string
  readonly durationLabel: string
  readonly categoryLabel: string
  readonly error: string
}

export interface HealthCheckRunVM {
  readonly id: string
  readonly kind: HealthCheckRunResult["kind"]
  readonly kindLabel: "Route Check" | "API Check"
  readonly environment: string
  readonly startedAtLabel: string
  readonly durationLabel: string
  readonly total: number
  readonly tested: number
  readonly ok: number
  readonly failureCount: number
  readonly status: "complete" | "attention"
  readonly persistenceWarning: string | null
  readonly failures: readonly HealthCheckFailureVM[]
}

export function toHealthCheckRunVM(result: HealthCheckRunResult | null): HealthCheckRunVM | null {
  if (!result) return null
  return {
    id: result.id,
    kind: result.kind,
    kindLabel: result.kind === "routes" ? "Route Check" : "API Check",
    environment: result.environment,
    startedAtLabel: new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "medium",
    }).format(new Date(result.startedAt)),
    durationLabel: durationLabel(result.durationMs),
    total: result.summary.total,
    tested: result.summary.tested,
    ok: result.summary.ok,
    failureCount: result.summary.failures,
    status: result.summary.failures === 0 ? "complete" : "attention",
    persistenceWarning: result.persistenceWarning ?? null,
    failures: result.results.filter((item) => !item.success).map((item) => ({
      appId: item.appId,
      project: item.project,
      route: item.route,
      url: item.url,
      method: item.method,
      statusLabel: item.statusHttp === null ? "Sem resposta" : `HTTP ${item.statusHttp}`,
      durationLabel: durationLabel(item.durationMs),
      categoryLabel: item.category ? CATEGORY_LABELS[item.category] : "Falha",
      error: item.error ?? "Falha sem detalhe adicional.",
    })),
  }
}
