import type { startLocalSeumeiOutboxWorker as StartWorker } from "./src/workers/local-worker-runtime"

declare global {
  var matrizSeumeiOutboxRuntime: ReturnType<typeof StartWorker> | undefined
}

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.MATRIZ_RUNTIME_PROFILE !== "local" || process.env.SEUMEI_OUTBOX_WORKER_ENABLED !== "true" || globalThis.matrizSeumeiOutboxRuntime) return
  const { startLocalSeumeiOutboxWorker } = await import("./src/workers/local-worker-runtime")
  globalThis.matrizSeumeiOutboxRuntime = startLocalSeumeiOutboxWorker(process.env)
}
