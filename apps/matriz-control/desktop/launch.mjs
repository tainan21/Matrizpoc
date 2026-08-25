import electronPath from "electron"
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"
import { randomBytes } from "node:crypto"

const appRoot = fileURLToPath(new URL("..", import.meta.url))
const packageManagerCli = process.env.npm_execpath
if (!packageManagerCli) throw new Error("The desktop launcher must be started through pnpm")
const localToken = process.env.MATRIZ_CONTROL_LOCAL_TOKEN ?? randomBytes(32).toString("hex")
const localEnvironment = { ...process.env, MATRIZ_CONTROL_LOCAL_TOKEN: localToken }
const web = spawn(process.execPath, [packageManagerCli, "run", "dev:web"], { cwd: appRoot, stdio: "inherit", windowsHide: true, env: localEnvironment })

async function waitForControl() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try { const response = await fetch("http://127.0.0.1:3008/unlock", { redirect: "manual" }); if (response.status < 500) return }
    catch { /* server is still starting */ }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error("Matriz Control web runtime did not start on port 3008")
}

try {
  await waitForControl()
  const desktop = spawn(electronPath, ["."], { cwd: appRoot, stdio: "inherit", windowsHide: true, env: { ...localEnvironment, MATRIZ_CONTROL_DESKTOP_URL: "http://127.0.0.1:3008/browser" } })
  desktop.once("exit", (code) => { web.kill(); process.exitCode = code ?? 0 })
} catch (error) {
  web.kill()
  throw error
}
