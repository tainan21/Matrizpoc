"use server"

import { hasActiveHubServerSession } from "../../../src/auth/server-session"
import type { HealthCheckKind } from "../../../src/domains/health-checks/domain"
import { toHealthCheckRunVM, type HealthCheckRunVM } from "../../../src/domains/health-checks/presenter"
import { runConfiguredHealthCheck } from "../../../src/domains/health-checks/runtime"

export interface RunHealthCheckActionResult {
  readonly ok: boolean
  readonly message: string
  readonly result: HealthCheckRunVM | null
}

export async function runHealthCheckAction(
  kind: HealthCheckKind,
  environment: string,
): Promise<RunHealthCheckActionResult> {
  if (!(await hasActiveHubServerSession())) {
    return { ok: false, message: "Sessão do MyHub necessária para executar o check.", result: null }
  }
  try {
    const result = await runConfiguredHealthCheck(kind, environment)
    return {
      ok: true,
      message: result.summary.failures === 0
        ? "Verificação concluída sem falhas."
        : `Verificação concluída com ${result.summary.failures} falha(s).`,
      result: toHealthCheckRunVM(result),
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Não foi possível executar o health check.",
      result: null,
    }
  }
}
