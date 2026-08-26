import { describe, expect, it } from "vitest"
import { mutateTerminal } from "./terminal-context"

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
