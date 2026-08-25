import { createServer } from "node:net"
import { describe, expect, it } from "vitest"
import { isPortAvailable } from "./port-check"

describe("port availability", () => {
  it("reports a bound port as unavailable", async () => {
    const server = createServer()
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    const address = server.address()
    if (!address || typeof address === "string") throw new Error("Missing TCP address")

    await expect(isPortAvailable("127.0.0.1", address.port)).resolves.toBe(false)
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  })
})
