import type { startOpsInboxWorker as StartWorker } from "./src/workers/ops-inbox-worker"

declare global {
  var matrizOpsInboxRuntime: Awaited<ReturnType<typeof StartWorker>> | undefined
}

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.MATRIZ_RUNTIME_PROFILE !== "local" || process.env.OPS_INBOX_WORKER_ENABLED !== "true" || globalThis.matrizOpsInboxRuntime) return
  const { startOpsInboxWorker } = await import("./src/workers/ops-inbox-worker")
  globalThis.matrizOpsInboxRuntime = await startOpsInboxWorker(process.env)
}
