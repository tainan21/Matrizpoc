#!/usr/bin/env node
import { randomUUID } from "node:crypto"
import { readFile } from "node:fs/promises"
import { connect } from "node:net"
import { join } from "node:path"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod"
import type { DesktopCommand } from "../src/domain/desktop-bridge"

interface RuntimeDiscovery { endpoint: string; token: string }
interface CommandResponse { id: string | null; result?: unknown; error?: string }

const server = new McpServer({ name: "matriz-control-browser", version: "0.2.0" })
const capsuleId = z.string().min(1).max(128)
const tabId = z.string().min(1).max(128)

function tool(name: string, description: string, inputSchema: Record<string, z.ZodTypeAny>, command: (input: Record<string, unknown>) => DesktopCommand) {
  server.registerTool(name, { description, inputSchema }, async (input) => present(await invoke(command(input))))
}

tool("browser_capsules_list", "List browser capsules and their active agent policy.", {}, () => ({ type: "capsule.list" }))
tool("browser_capsule_create", "Create an isolated agent-safe capsule. Human and agent-full capsules require the desktop UI.", { name: z.string().min(1).max(80) }, ({ name }) => ({ type: "capsule.create", name: String(name), kind: "agent", policy: "agent-safe" }))
tool("browser_tabs_list", "List tabs in an authorized capsule.", { capsuleId }, ({ capsuleId }) => ({ type: "tab.list", capsuleId: String(capsuleId) }))
tool("browser_tab_open", "Open a URL or web search in an authorized capsule.", { capsuleId, input: z.string().min(1).max(8192) }, ({ capsuleId, input }) => ({ type: "tab.open", capsuleId: String(capsuleId), input: String(input) }))
tool("browser_tab_navigate", "Navigate an existing authorized tab.", { tabId, input: z.string().min(1).max(8192) }, ({ tabId, input }) => ({ type: "tab.navigate", tabId: String(tabId), input: String(input) }))
tool("browser_page_snapshot", "Return a textual page snapshot with stable element selectors.", { tabId }, ({ tabId }) => ({ type: "page.snapshot", tabId: String(tabId) }))
tool("browser_page_screenshot", "Capture the visible page as a PNG image.", { tabId }, ({ tabId }) => ({ type: "page.screenshot", tabId: String(tabId) }))
tool("browser_page_click", "Click an element reference returned by the latest page snapshot.", { tabId, ref: z.string().min(1).max(32) }, ({ tabId, ref }) => ({ type: "page.click", tabId: String(tabId), ref: String(ref) }))
tool("browser_page_type", "Type text into an editable element reference. Typed text is never written to the audit log.", { tabId, ref: z.string().min(1).max(32), text: z.string().max(100000) }, ({ tabId, ref, text }) => ({ type: "page.type", tabId: String(tabId), ref: String(ref), text: String(text) }))
tool("browser_download", "Start an HTTP(S) download in an authorized tab.", { tabId, url: z.string().min(1).max(8192) }, ({ tabId, url }) => ({ type: "page.download", tabId: String(tabId), url: String(url) }))
tool("browser_library_search", "Search bookmarks and notes inside one authorized capsule.", { capsuleId, query: z.string().min(1).max(1024) }, ({ capsuleId, query }) => ({ type: "library.search", capsuleId: String(capsuleId), query: String(query) }))
tool("browser_projects_list", "List project IDs accepted by the safe local editor.", {}, () => ({ type: "project.list" }))
tool("browser_file_read", "Read an allowed text file from a cataloged project.", { capsuleId, projectId: z.string().min(1).max(128), path: z.string().min(1).max(1024) }, ({ capsuleId, projectId, path }) => ({ type: "file.read", capsuleId: String(capsuleId), projectId: String(projectId), path: String(path) }))
tool("browser_file_write", "Atomically write an allowed text file if its version still matches.", { capsuleId, projectId: z.string().min(1).max(128), path: z.string().min(1).max(1024), content: z.string().max(2 * 1024 * 1024), expectedVersion: z.string().min(1).max(128) }, ({ capsuleId, projectId, path, content, expectedVersion }) => ({ type: "file.write", capsuleId: String(capsuleId), projectId: String(projectId), path: String(path), content: String(content), expectedVersion: String(expectedVersion) }))
tool("browser_agent_kill", "Activate the local automation kill switch for this desktop session.", {}, () => ({ type: "agent.kill" }))

async function discovery(): Promise<RuntimeDiscovery> {
  const path = process.env.MATRIZ_CONTROL_MCP_RUNTIME ?? join(process.env.APPDATA ?? "", "Matriz Control", "mcp-runtime.json")
  const value = JSON.parse(await readFile(path, "utf8")) as Partial<RuntimeDiscovery>
  if (!value.endpoint || !value.token) throw new Error("Matriz Control desktop runtime is unavailable")
  return { endpoint: value.endpoint, token: value.token }
}

async function invoke(command: DesktopCommand): Promise<unknown> {
  const runtime = await discovery()
  const id = randomUUID()
  return new Promise((resolve, reject) => {
    const socket = connect(runtime.endpoint)
    let pending = ""
    socket.setEncoding("utf8")
    socket.once("connect", () => socket.write(`${JSON.stringify({ id, token: runtime.token, command })}\n`))
    socket.on("data", (chunk) => {
      pending += chunk
      const newline = pending.indexOf("\n")
      if (newline < 0) return
      socket.end()
      try {
        const response = JSON.parse(pending.slice(0, newline)) as CommandResponse
        if (response.id !== id) throw new Error("Mismatched desktop response")
        if (response.error) reject(new Error(response.error)); else resolve(response.result)
      } catch (error) { reject(error) }
    })
    socket.once("error", () => reject(new Error("Matriz Control desktop runtime is unavailable")))
  })
}

function present(result: unknown) {
  if (isScreenshot(result)) return { content: [{ type: "image" as const, data: result.data, mimeType: result.mimeType }, { type: "text" as const, text: result.filename }] }
  return { content: [{ type: "text" as const, text: typeof result === "string" ? result : JSON.stringify(result, null, 2) }] }
}

function isScreenshot(value: unknown): value is { filename: string; mimeType: "image/png"; data: string } {
  return Boolean(value && typeof value === "object" && typeof (value as { data?: unknown }).data === "string" && (value as { mimeType?: unknown }).mimeType === "image/png")
}

server.connect(new StdioServerTransport()).catch(() => process.exit(1))
