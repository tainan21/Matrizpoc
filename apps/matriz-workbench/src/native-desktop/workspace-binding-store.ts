import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import path from "node:path"
import { randomUUID } from "node:crypto"
import type { NativeWorkspaceBindingStore } from "./workspace-binding"

const MAX_BINDING_BYTES = 2_048

export function createNativeWorkspaceBindingStore(filePath: string): NativeWorkspaceBindingStore {
  return {
    async read(): Promise<string | undefined> {
      try {
        const source = await readFile(filePath, "utf8")
        if (Buffer.byteLength(source, "utf8") > MAX_BINDING_BYTES) return undefined
        const parsed = JSON.parse(source) as { workspaceRoot?: unknown }
        return typeof parsed.workspaceRoot === "string" && parsed.workspaceRoot.length <= 1_024
          ? parsed.workspaceRoot
          : undefined
      } catch {
        return undefined
      }
    },
    async write(workspaceRoot: string): Promise<void> {
      await mkdir(path.dirname(filePath), { recursive: true })
      const temporaryPath = `${filePath}.${randomUUID()}.tmp`
      await writeFile(temporaryPath, `${JSON.stringify({ workspaceRoot })}\n`, { encoding: "utf8", mode: 0o600 })
      await rename(temporaryPath, filePath)
    },
  }
}
