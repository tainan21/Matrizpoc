import { EventEmitter } from "node:events"
import { describe, expect, it } from "vitest"
import { createAppSessionVaultHandler, type AppSessionVaultRepository } from "./app-session-vault"

class Response extends EventEmitter {
  statusCode = 0; body = ""; headers = new Map<string, unknown>()
  setHeader(name: string, value: unknown) { this.headers.set(name, value) }
  writeHead(status: number, headers?: Record<string, unknown>) { this.statusCode = status; Object.entries(headers ?? {}).forEach(([key, value]) => this.setHeader(key, value)); return this }
  end(body = "") { this.body += body; return this }
}

function request(path: string, body: unknown, credential = "hub-client:super-secret") {
  return { url: path, method: "POST", headers: { authorization: `Basic ${Buffer.from(credential).toString("base64")}` }, [Symbol.asyncIterator]: async function* () { yield Buffer.from(JSON.stringify(body)) } } as never
}

function memoryRepository(): AppSessionVaultRepository & { rows: Map<string, { handleHash: string; clientId: string; appId: string; ciphertext: string; expiresAt: Date; revision: number }> } {
  const rows = new Map<string, { handleHash: string; clientId: string; appId: string; ciphertext: string; expiresAt: Date; revision: number }>()
  return {
    rows,
    create: async row => { rows.set(row.handleHash, row) },
    read: async input => rows.get(input.handleHash) ?? null,
    delete: async input => rows.delete(input.handleHash),
    update: async (input, row) => {
      const current = rows.get(input.handleHash)
      if (!current || current.clientId !== input.clientId || current.appId !== input.appId || current.revision !== input.revision) return false
      rows.set(input.handleHash, { ...current, ...row, revision: current.revision + 1 })
      return true
    },
    rotate: async (oldRow, row) => { if (!rows.delete(oldRow.handleHash)) return false; rows.set(row.handleHash, row); return true },
  }
}

const session = { session: { expiresAt: new Date(Date.now() + 60_000).toISOString() }, accessToken: "plain-access-token", refreshToken: "plain-refresh-token" }

describe("durable OIDC app session vault", () => {
  it("stores only encrypted payload and permits a second instance to read it", async () => {
    const repository = memoryRepository()
    const options = { encryptionKey: Buffer.alloc(32, 7).toString("base64url"), repository, authenticate: async (clientId: string, secret: string) => clientId === "hub-client" && secret === "super-secret" ? { clientId, appId: "matriz-hub" } : null }
    const first = createAppSessionVaultHandler(options)
    const created = new Response()
    await first(request("/api/app-sessions/create", { appId: "matriz-hub", value: session }), created as never)
    expect(created.statusCode).toBe(201)
    const handle = JSON.parse(created.body).handle as string
    const stored = [...repository.rows.values()][0]!
    expect(stored.ciphertext).not.toContain("plain-access-token")
    expect(stored).toMatchObject({ clientId: "hub-client", appId: "matriz-hub" })

    const second = createAppSessionVaultHandler(options)
    const read = new Response()
    await second(request("/api/app-sessions/read", { appId: "matriz-hub", handle }), read as never)
    expect(JSON.parse(read.body).value).toMatchObject(session)
  })

  it("rejects app spoofing and invalidates the old handle on rotation", async () => {
    const repository = memoryRepository()
    const handler = createAppSessionVaultHandler({ encryptionKey: Buffer.alloc(32, 8).toString("base64url"), repository, authenticate: async () => ({ clientId: "hub-client", appId: "matriz-hub" }) })
    const spoof = new Response()
    await handler(request("/api/app-sessions/create", { appId: "spot", value: session }), spoof as never)
    expect(spoof.statusCode).toBe(403)

    const created = new Response(); await handler(request("/api/app-sessions/create", { appId: "matriz-hub", value: session }), created as never)
    const oldHandle = JSON.parse(created.body).handle
    const rotated = new Response(); await handler(request("/api/app-sessions/rotate", { appId: "matriz-hub", handle: oldHandle, value: session }), rotated as never)
    const readOld = new Response(); await handler(request("/api/app-sessions/read", { appId: "matriz-hub", handle: oldHandle }), readOld as never)
    expect(JSON.parse(readOld.body).value).toBeNull()
    expect(JSON.parse(rotated.body).handle).not.toBe(oldHandle)
  })
})
