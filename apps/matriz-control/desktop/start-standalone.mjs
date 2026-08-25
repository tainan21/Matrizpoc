import { spawn } from "node:child_process"
import { cp, mkdir } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const server = resolve(appRoot, ".next", "standalone", "apps", "matriz-control", "server.js")
const staticTarget = resolve(dirname(server), ".next", "static")
await mkdir(staticTarget, { recursive: true })
await cp(resolve(appRoot, ".next", "static"), staticTarget, { recursive: true, force: true })
const child = spawn(process.execPath, [server], {
  cwd: dirname(server),
  env: { ...process.env, HOSTNAME: "127.0.0.1", PORT: process.env.PORT ?? "3008" },
  stdio: "inherit",
})

for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal))
child.on("exit", (code) => process.exit(code ?? 1))
