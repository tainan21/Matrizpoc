import { cp, mkdir, stat } from "node:fs/promises"
import path from "node:path"

const appRoot = path.resolve(import.meta.dirname, "..")
const standaloneRoot = path.join(appRoot, ".next", "standalone", "apps", "matriz-workbench")

async function exists(target: string): Promise<boolean> {
  try {
    await stat(target)
    return true
  } catch {
    return false
  }
}

async function copyRuntimeDirectory(source: string, destination: string): Promise<void> {
  if (!(await exists(source))) return
  await mkdir(path.dirname(destination), { recursive: true })
  await cp(source, destination, { recursive: true, force: true, errorOnExist: false })
}

if (!(await exists(path.join(standaloneRoot, "server.js")))) {
  throw new Error("Next standalone runtime ausente. Execute o build do Workbench antes do pacote desktop.")
}

await copyRuntimeDirectory(
  path.join(appRoot, ".next", "static"),
  path.join(standaloneRoot, ".next", "static"),
)
await copyRuntimeDirectory(path.join(appRoot, "public"), path.join(standaloneRoot, "public"))
