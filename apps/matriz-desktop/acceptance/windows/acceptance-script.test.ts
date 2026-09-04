import { spawn, spawnSync } from "node:child_process"
import { once } from "node:events"
import { existsSync, readFileSync, statSync } from "node:fs"
import { createConnection } from "node:net"
import path from "node:path"
import { createInterface } from "node:readline"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(testDirectory, "../..")
const workspaceRoot = path.resolve(appRoot, "../..")
const scriptPath = path.join(testDirectory, "matriz-control-acceptance.ps1")
const measureScriptPath = path.join(testDirectory, "measure-process.ps1")
const listenerScriptPath = path.join(testDirectory, "probe-listener.ps1")
const installedRoot = path.join(process.env.LOCALAPPDATA ?? "", "Matriz Control")
const installedExecutable = path.join(installedRoot, "matriz-control.exe")
const outputRoot = path.join(workspaceRoot, "output", "matriz-control-acceptance", "script-test")
const desktopVersion = (JSON.parse(readFileSync(path.join(appRoot, "package.json"), "utf8")) as { version: string }).version

function runAcceptance(args: readonly string[]) {
  return spawnSync("pwsh", ["-NoProfile", "-File", scriptPath, ...args], {
    cwd: workspaceRoot,
    encoding: "utf8",
  })
}

describe.runIf(process.platform === "win32")("Windows acceptance script", () => {
  it("persists the installed lifecycle object before printing its verdict", () => {
    const source = readFileSync(scriptPath, "utf8")

    expect(source).toContain("$lifecycle = [PSCustomObject]@{")
    expect(source).toContain("$lifecycle | ConvertTo-Json -Depth 4 | Set-Content")
  })

  it("waits conditionally for asynchronous NSIS cleanup before declaring uninstall failure", () => {
    const source = readFileSync(scriptPath, "utf8")

    expect(source).toContain("$uninstallDeadlineSeconds = 120")
    expect(source).toContain("AddSeconds($uninstallDeadlineSeconds)")
    expect(source).toContain("while ((Test-Path -LiteralPath $productExecutable -PathType Leaf)")
  })

  it("records a clean tracked-artifacts gate after uninstall", () => {
    const source = readFileSync(scriptPath, "utf8")

    expect(source).toContain("corepack pnpm --dir $workspaceRoot verify:tracked-artifacts")
    expect(source).toContain("tracked-artifacts.json")
    expect(source).toContain("--tracked-artifacts-evidence")
  })

  it.runIf(existsSync(installedExecutable))("inspects the existing installation without modifying its executable", () => {
    const before = statSync(installedExecutable)
    const result = runAcceptance([
      "-Mode",
      "Inspect",
      "-OutputRoot",
      outputRoot,
      "-InstalledRoot",
      installedRoot,
      "-RunId",
      "inspect-test",
    ])
    const after = statSync(installedExecutable)

    expect(result.status, result.stderr).toBe(0)
    expect(JSON.parse(result.stdout)).toMatchObject({
      schemaVersion: "v1",
      target: "installed-baseline",
      productName: "Matriz Control",
      productVersion: desktopVersion,
    })
    expect(after.mtimeMs).toBe(before.mtimeMs)
    expect(after.size).toBe(before.size)
  })

  it("rejects cleanup when the requested output is the workspace root", () => {
    const result = runAcceptance([
      "-Mode",
      "Cleanup",
      "-OutputRoot",
      workspaceRoot,
      "-InstalledRoot",
      installedRoot,
      "-RunId",
      "unsafe-test",
    ])

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain("Unsafe acceptance output path")
  })

  it("owns a loopback listener and exits cleanly through its control input", async () => {
    const child = spawn("pwsh", ["-NoProfile", "-File", listenerScriptPath, "-Port", "0"], {
      cwd: workspaceRoot,
      stdio: ["pipe", "pipe", "pipe"],
    })
    const lines = createInterface({ input: child.stdout })
    const readiness = await Promise.race([
      once(lines, "line").then(([line]) => JSON.parse(String(line))),
      once(child, "exit").then(([code]) => {
        throw new Error(`Listener exited before readiness with code ${String(code)}`)
      }),
    ])

    expect(readiness).toMatchObject({ schemaVersion: "v1", ready: true, address: "127.0.0.1" })
    expect(readiness.pid).toBe(child.pid)
    expect(readiness.port).toBeGreaterThan(0)

    const socket = createConnection({ host: "127.0.0.1", port: readiness.port })
    await once(socket, "connect")
    socket.destroy()
    child.stdin.write("stop\n")
    const [exitCode] = await once(child, "exit")

    expect(exitCode).toBe(0)
  })

  it("plans packaging with a fixed workspace command and expected NSIS artifact", () => {
    const result = runAcceptance([
      "-Mode",
      "Package",
      "-PlanOnly",
      "-OutputRoot",
      outputRoot,
      "-InstalledRoot",
      installedRoot,
      "-RunId",
      "package-plan",
    ])

    expect(result.status, result.stderr).toBe(0)
    expect(JSON.parse(result.stdout)).toMatchObject({
      schemaVersion: "v1",
      mode: "Package",
      planOnly: true,
      actions: [
        {
          executable: "pnpm.cmd",
          arguments: ["--filter", "@matriz/app-matriz-desktop", "package"],
        },
      ],
    })
    expect(result.stdout).toContain(`Matriz Control_${desktopVersion}_x64-setup.exe`)
  })

  it("plans install, launch and uninstall from resolved product paths", () => {
    const result = runAcceptance([
      "-Mode",
      "Installed",
      "-PlanOnly",
      "-OutputRoot",
      outputRoot,
      "-InstalledRoot",
      installedRoot,
      "-RunId",
      "installed-plan",
    ])

    expect(result.status, result.stderr).toBe(0)
    expect(JSON.parse(result.stdout)).toMatchObject({
      schemaVersion: "v1",
      mode: "Installed",
      planOnly: true,
      productExecutable: path.join(installedRoot, "matriz-control.exe"),
      productUninstaller: path.join(installedRoot, "uninstall.exe"),
    })
  })

  it("refuses installed lifecycle mutation outside the product acceptance roots", () => {
    const result = runAcceptance([
      "-Mode",
      "Installed",
      "-OutputRoot",
      outputRoot,
      "-InstalledRoot",
      workspaceRoot,
      "-RunId",
      "unsafe-install",
    ])

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain("Unsafe Matriz Control installation path")
  })

  it("refuses to measure a PID that is not the exact Matriz Control executable", () => {
    const result = spawnSync("pwsh", [
      "-NoProfile",
      "-File",
      measureScriptPath,
      "-Pid",
      String(process.pid),
      "-DurationSeconds",
      "1",
      "-OutputRoot",
      outputRoot,
    ], {
      cwd: workspaceRoot,
      encoding: "utf8",
    })

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain("is not the Matriz Control executable")
  })
})
