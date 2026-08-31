import type { startLocalHubOutboxWorker as StartWorker } from "./src/domains/docs/workers/local-worker-runtime"

declare global { var matrizHubOutboxRuntime: ReturnType<typeof StartWorker> | undefined }

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.MATRIZ_RUNTIME_PROFILE !== "local" || process.env.HUB_OUTBOX_WORKER_ENABLED !== "true" || globalThis.matrizHubOutboxRuntime) return
  const { startLocalHubOutboxWorker } = await import("./src/domains/docs/workers/local-worker-runtime")
  globalThis.matrizHubOutboxRuntime = startLocalHubOutboxWorker(process.env)
}
