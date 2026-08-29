import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto"
import type { IncomingMessage, ServerResponse } from "node:http"

type VaultRow = { handleHash: string; clientId: string; appId: string; ciphertext: string; expiresAt: Date; revision: number }
export interface AppSessionVaultRepository {
  create(row: VaultRow): Promise<void>
  read(input: { handleHash: string; clientId: string; appId: string }): Promise<VaultRow | null>
  rotate(previous: { handleHash: string; clientId: string; appId: string }, row: VaultRow): Promise<boolean>
  update(input: { handleHash: string; clientId: string; appId: string; revision: number }, row: Pick<VaultRow, "ciphertext" | "expiresAt">): Promise<boolean>
  delete(input: { handleHash: string; clientId: string; appId: string }): Promise<boolean>
}
type ClientIdentity = { clientId: string; appId: string }

export function createAppSessionVaultHandler(input: { encryptionKey: string; repository: AppSessionVaultRepository; authenticate(clientId: string, secret: string): Promise<ClientIdentity | null> }) {
  const key = Buffer.from(input.encryptionKey, "base64url")
  if (key.length !== 32) throw new Error("App session encryption key must encode 32 bytes")
  return async (request: IncomingMessage, response: ServerResponse): Promise<boolean> => {
    const path = request.url?.split("?", 1)[0]
    if (!path?.startsWith("/api/app-sessions/")) return false
    response.setHeader("Cache-Control", "no-store, private")
    if (request.method !== "POST") return json(response, 405, { error: "method_not_allowed" })
    const credentials = basic(request.headers.authorization)
    const client = credentials ? await input.authenticate(credentials.clientId, credentials.secret) : null
    if (!client) return json(response, 401, { error: "invalid_client" })
    const body = await readJson(request)
    if (body.appId !== client.appId) return json(response, 403, { error: "app_binding_rejected" })
    const binding = { clientId: client.clientId, appId: client.appId }
    if (path.endsWith("/create")) {
      if (!validValue(body.value)) return json(response, 400, { error: "invalid_request" })
      const created = row(binding, body.value, key)
      await input.repository.create(created.persisted)
      return json(response, 201, { handle: created.handle })
    }
    if (typeof body.handle !== "string" || body.handle.length < 32) return json(response, 400, { error: "invalid_request" })
    const handleHash = digest(body.handle)
    if (path.endsWith("/read")) {
      const found = await input.repository.read({ ...binding, handleHash })
      if (!found || found.expiresAt <= new Date()) return json(response, 200, { value: null })
      try { return json(response, 200, { value: { ...open(found.ciphertext, key, binding) as Record<string, unknown>, vaultRevision: found.revision } }) } catch { return json(response, 200, { value: null }) }
    }
    if (path.endsWith("/rotate")) {
      if (!validValue(body.value)) return json(response, 400, { error: "invalid_request" })
      const created = row(binding, body.value, key)
      const replaced = await input.repository.rotate({ ...binding, handleHash }, created.persisted)
      return replaced ? json(response, 200, { handle: created.handle }) : json(response, 404, { error: "session_not_found" })
    }
    if (path.endsWith("/update")) {
      if (!validValue(body.value)) return json(response, 400, { error: "invalid_request" })
      const replacement = rowForHandle(binding, body.value, key)
      if (!Number.isInteger(body.expectedRevision) || body.expectedRevision < 0) return json(response, 400, { error: "invalid_revision" })
      return await input.repository.update({ ...binding, handleHash, revision: body.expectedRevision }, replacement) ? json(response, 200, {}) : json(response, 409, { error: "session_changed" })
    }
    if (path.endsWith("/delete")) { await input.repository.delete({ ...binding, handleHash }); return json(response, 200, {}) }
    return json(response, 404, { error: "not_found" })
  }
}

function row(binding: ClientIdentity, value: Record<string, unknown>, key: Buffer) {
  const handle = randomBytes(32).toString("base64url")
  const expiresAt = new Date(String((value.session as { expiresAt: string }).expiresAt))
  return { handle, persisted: { ...binding, handleHash: digest(handle), ciphertext: seal(value, key, binding), expiresAt, revision: 0 } }
}
function rowForHandle(binding: ClientIdentity, value: Record<string, unknown>, key: Buffer) { return { ciphertext: seal(value, key, binding), expiresAt: new Date(String((value.session as { expiresAt: string }).expiresAt)) } }
function digest(value: string) { return createHash("sha256").update(value).digest("base64url") }
function seal(value: unknown, key: Buffer, binding: ClientIdentity) { const nonce = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", key, nonce); cipher.setAAD(Buffer.from(`${binding.clientId}\0${binding.appId}`)); const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]); return `aes-256-gcm-v1$${nonce.toString("base64url")}$${cipher.getAuthTag().toString("base64url")}$${ciphertext.toString("base64url")}` }
function open(value: string, key: Buffer, binding: ClientIdentity) { const [version, nonce, tag, ciphertext] = value.split("$"); if (version !== "aes-256-gcm-v1" || !nonce || !tag || !ciphertext) throw new Error("invalid ciphertext"); const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(nonce, "base64url")); decipher.setAAD(Buffer.from(`${binding.clientId}\0${binding.appId}`)); decipher.setAuthTag(Buffer.from(tag, "base64url")); return JSON.parse(Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8")) }
function basic(value: string | string[] | undefined) { const match = /^Basic (\S+)$/i.exec(String(value ?? "")); if (!match) return null; try { const decoded = Buffer.from(match[1]!, "base64").toString("utf8"); const separator = decoded.indexOf(":"); if (separator < 1) return null; return { clientId: decoded.slice(0, separator), secret: decoded.slice(separator + 1) } } catch { return null } }
function validValue(value: unknown): value is Record<string, unknown> { if (!value || typeof value !== "object") return false; const expiresAt = (value as { session?: { expiresAt?: unknown } }).session?.expiresAt; return typeof expiresAt === "string" && Number.isFinite(Date.parse(expiresAt)) && Date.parse(expiresAt) > Date.now() }
async function readJson(request: IncomingMessage): Promise<Record<string, any>> { let size = 0; const chunks: Buffer[] = []; for await (const chunk of request) { const buffer = Buffer.from(chunk); size += buffer.length; if (size > 64 * 1024) throw new Error("body too large"); chunks.push(buffer) } try { return JSON.parse(Buffer.concat(chunks).toString("utf8")) } catch { return {} } }
function json(response: ServerResponse, status: number, value: unknown) { response.writeHead(status, { "content-type": "application/json" }); response.end(JSON.stringify(value)); return true }

export function secureSecretEquals(actual: string, expected: string) { const a = Buffer.from(actual); const b = Buffer.from(expected); return a.length === b.length && timingSafeEqual(a, b) }
