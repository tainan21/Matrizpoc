import { afterEach, describe, expect, it, vi } from "vitest"
import { createHttpMockAuthBroker } from "@matriz/platform-auth/server"

describe("HTTP mock auth broker", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("converts a network failure into a recoverable Hub message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")))

    const broker = createHttpMockAuthBroker("http://localhost:3000")

    await expect(broker.signInWithEmail("ana@matriz.com"))
      .rejects.toThrow("O Hub de autenticacao esta indisponivel. Inicie-o em localhost:3000 e tente novamente.")
  })
})
