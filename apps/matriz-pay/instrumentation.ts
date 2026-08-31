import type { startLocalPayOutboxWorker as StartWorker } from "./src/workers/local-worker-runtime"

declare global {
  var matrizPayOutboxRuntime: ReturnType<typeof StartWorker> | undefined
}

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.MATRIZ_RUNTIME_PROFILE !== "local" || process.env.PAY_OUTBOX_WORKER_ENABLED !== "true" || globalThis.matrizPayOutboxRuntime) return
  const { startLocalPayOutboxWorker } = await import("./src/workers/local-worker-runtime")
  globalThis.matrizPayOutboxRuntime = startLocalPayOutboxWorker(process.env)
}
