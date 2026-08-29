import { createConnection } from "node:net"

export function isLoopbackPortAvailable(outcome: "connected" | "timeout" | { code?: string }): boolean {
  return typeof outcome === "object" && outcome.code === "ECONNREFUSED"
}

export function observeLoopbackPort(port: number): Promise<boolean> {
  if (!Number.isInteger(port) || port < 1 || port > 65_535) return Promise.resolve(false)
  return new Promise((done) => {
    const socket = createConnection({ host: "127.0.0.1", port })
    let completed = false
    const finish = (available: boolean) => {
      if (completed) return
      completed = true
      socket.destroy()
      done(available)
    }
    socket.setTimeout(700)
    socket.once("connect", () => finish(isLoopbackPortAvailable("connected")))
    socket.once("timeout", () => finish(isLoopbackPortAvailable("timeout")))
    socket.once("error", (error) => finish(isLoopbackPortAvailable(error as { code?: string })))
  })
}
