import { mkdtemp, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import {
  buildCodexChildEnvironment,
  CodexAppServerClient,
  type RpcNotification,
  type RpcServerRequest,
} from "./app-server-client"

const roots: string[] = []

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})

describe("CodexAppServerClient", () => {
  it("does not forward application tokens or provider credentials", () => {
    const environment = buildCodexChildEnvironment({
      NODE_ENV: "test",
      PATH: "C:\\tools",
      USERPROFILE: "C:\\Users\\sample",
      WORKBENCH_LOCAL_TOKEN: "must-not-leave-the-parent",
      OPENAI_API_KEY: "must-not-leave-the-parent",
      GITHUB_TOKEN: "must-not-leave-the-parent",
    })

    expect(environment).toEqual({
      NODE_ENV: "test",
      PATH: "C:\\tools",
      USERPROFILE: "C:\\Users\\sample",
    })
  })

  it("performs the handshake, routes responses and answers server requests", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "matriz-codex-rpc-"))
    roots.push(root)
    const server = path.join(root, "fake-app-server.mjs")
    await writeFile(
      server,
      [
        'import readline from "node:readline"',
        "const lines = readline.createInterface({ input: process.stdin })",
        "const send = (value) => process.stdout.write(`${JSON.stringify(value)}\\n`)",
        "lines.on('line', (line) => {",
        "  const message = JSON.parse(line)",
        "  if (message.method === 'initialize') send({ id: message.id, result: { platformFamily: 'test' } })",
        "  else if (message.method === 'echo') {",
        "    send({ id: message.id, result: { value: message.params.value } })",
        "    send({ method: 'test/notification', params: { ok: true } })",
        "    send({ method: 'item/fileChange/requestApproval', id: 'approval-1', params: { reason: 'test' } })",
        "  } else if (message.id === 'approval-1' && message.result) {",
        "    send({ method: 'test/approvalResolved', params: message.result })",
        "  }",
        "})",
      ].join("\n"),
    )
    const client = new CodexAppServerClient(process.execPath, root, [server])
    const notifications: RpcNotification[] = []
    client.on("notification", (value: RpcNotification) => notifications.push(value))
    const approvalResolved = new Promise<RpcNotification>((resolve) => {
      client.on("notification", (value: RpcNotification) => {
        if (value.method === "test/approvalResolved") resolve(value)
      })
    })
    client.on("serverRequest", (request: RpcServerRequest) => {
      client.respond(request.id, { decision: "accept" })
    })

    await client.connect()
    await expect(client.request("echo", { value: "ok" })).resolves.toEqual({ value: "ok" })
    await expect(approvalResolved).resolves.toMatchObject({
      method: "test/approvalResolved",
      params: { decision: "accept" },
    })
    expect(notifications).toContainEqual({
      method: "test/notification",
      params: { ok: true },
    })
    const closed = new Promise<void>((resolve) => client.once("exit", () => resolve()))
    client.close()
    await closed
  })
})
