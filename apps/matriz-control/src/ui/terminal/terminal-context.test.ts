import { describe, expect, it } from "vitest"
import { mutateTerminal, startSequentialTerminalPolling } from "./terminal-context"

describe("mutateTerminal", () => {
  it("forwards cancellation to an abortable terminal start request", async () => {
    const controller = new AbortController()
    let receivedSignal: AbortSignal | undefined
    const result = mutateTerminal(async (_url, init) => new Promise<Response>((_resolve, reject) => {
      receivedSignal = init?.signal ?? undefined
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true })
    }), "/api/terminal/sessions", "POST", { projectId: "health", actionId: "dev" }, controller.signal)

    controller.abort()

    await expect(result).rejects.toMatchObject({ name: "AbortError" })
    expect(receivedSignal).toBe(controller.signal)
  })
})

describe("startSequentialTerminalPolling", () => {
  it("never overlaps slow refreshes and stops scheduling after cancellation", async () => {
    const resolvers: Array<() => void> = []
    const scheduled: Array<() => void> = []
    let calls = 0
    const stop = startSequentialTerminalPolling(
      () => { calls += 1; return new Promise<void>((resolve) => resolvers.push(resolve)) },
      (callback) => { scheduled.push(callback); return 1 },
      () => undefined,
      1_000,
    )

    scheduled.shift()?.()
    expect(calls).toBe(1)
    expect(scheduled).toHaveLength(0)

    resolvers.shift()?.()
    await Promise.resolve()
    await Promise.resolve()
    expect(scheduled).toHaveLength(1)

    stop()
    scheduled.shift()?.()
    expect(calls).toBe(1)
  })
})
