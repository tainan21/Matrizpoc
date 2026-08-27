import { createServer } from "node:net"
import { afterEach, describe, expect, it } from "vitest"
import {
  assertWorkbenchDesktopPortAvailable,
  createWorkbenchDesktopServerEnvironment,
  workbenchDesktopServer,
} from "./server"

const servers: ReturnType<typeof createServer>[] = []

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve())
  })))
})

describe("native desktop server", () => {
  it("defines the fixed loopback server contract for the packaged Next runtime", () => {
    expect(workbenchDesktopServer("C:\\Program Files\\Matriz Workbench")).toEqual({
      host: "127.0.0.1",
      port: 3005,
      serverPath: "C:\\Program Files\\Matriz Workbench\\.next\\standalone\\apps\\matriz-workbench\\server.js",
    })
  })

  it("passes only the native local session and validated workspace to the server process", () => {
    expect(createWorkbenchDesktopServerEnvironment({
      workspaceRoot: "C:\\Matriz",
      sessionToken: "local-only-session-token",
      inherited: { PATH: "C:\\Windows", ELECTRON_RUN_AS_NODE: "1" },
    })).toEqual({
      PATH: "C:\\Windows",
      HOSTNAME: "127.0.0.1",
      PORT: "3005",
      WORKBENCH_RUNTIME_MODE: "native-desktop",
      WORKBENCH_LOCAL_TOKEN: "local-only-session-token",
      MATRIZ_REPO_ROOT: "C:\\Matriz",
    })
  })

  it("reports an occupied port without taking ownership of the existing listener", async () => {
    const occupied = createServer()
    servers.push(occupied)
    await new Promise<void>((resolve) => occupied.listen(0, "127.0.0.1", resolve))
    const address = occupied.address()
    if (!address || typeof address === "string") throw new Error("expected a TCP test listener")

    await expect(assertWorkbenchDesktopPortAvailable(address.port)).rejects.toThrow(
      `127.0.0.1:${address.port} já está em uso por outro processo`,
    )
    expect(occupied.listening).toBe(true)
  })
})
