import { createServer } from "node:net"

export async function isPortAvailable(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer()
    server.unref()
    server.once("error", () => resolve(false))
    server.listen(port, host, () => {
      server.close(() => resolve(true))
    })
  })
}
