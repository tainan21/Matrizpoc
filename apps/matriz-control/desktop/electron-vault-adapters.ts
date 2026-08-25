import { safeStorage } from "electron"
import { spawn } from "node:child_process"
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import { randomUUID } from "node:crypto"
import type { VaultHelper, VaultHelperRequest, VaultHelperResult, VaultKeyStore } from "../src/integration/browser/bitlocker-vault"

export class ElectronSafeStorageKeyStore implements VaultKeyStore {
  constructor(private readonly path: string) {}

  async load() {
    try {
      if (!safeStorage.isEncryptionAvailable()) throw new Error("Windows credential protection is unavailable")
      return safeStorage.decryptString(await readFile(this.path))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined
      throw error
    }
  }

  async save(value: string) {
    if (!safeStorage.isEncryptionAvailable()) throw new Error("Windows credential protection is unavailable")
    await mkdir(dirname(this.path), { recursive: true })
    const temporary = `${this.path}.${randomUUID()}.tmp`
    try {
      await writeFile(temporary, safeStorage.encryptString(value), { mode: 0o600, flag: "wx" })
      await rename(temporary, this.path)
    } catch (error) {
      await unlink(temporary).catch(() => undefined)
      throw error
    }
  }

  async clear() { await unlink(this.path).catch((error: NodeJS.ErrnoException) => { if (error.code !== "ENOENT") throw error }) }
}

export class PowerShellVaultHelper implements VaultHelper {
  constructor(private readonly scriptPath: string) {}

  run(request: VaultHelperRequest): Promise<VaultHelperResult> {
    return new Promise((resolve, reject) => {
      const child = spawn("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", this.scriptPath, "-Operation", request.operation, "-VhdxPath", request.vhdxPath, "-MountPath", request.mountPath], { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] })
      let output = ""
      let failure = ""
      child.stdout.setEncoding("utf8").on("data", (chunk) => { output += chunk; if (output.length > 64_000) child.kill() })
      child.stderr.setEncoding("utf8").on("data", (chunk) => { failure += chunk; if (failure.length > 64_000) child.kill() })
      if (request.recoveryKey) child.stdin.end(`${request.recoveryKey}\n`); else child.stdin.end()
      child.once("error", () => reject(new Error("The guided BitLocker helper could not start")))
      child.once("exit", (code) => {
        if (code !== 0) { reject(new Error(safePowerShellError(failure))); return }
        try {
          const line = output.trim().split(/\r?\n/).at(-1)
          if (!line) throw new Error("Empty helper response")
          resolve(JSON.parse(line) as VaultHelperResult)
        } catch { reject(new Error("The guided BitLocker helper returned an invalid response")) }
      })
    })
  }
}

function safePowerShellError(value: string) {
  const first = value.split(/\r?\n/).find((line) => line.trim())?.replace(/[A-Z]:\\[^\s:]+/gi, "[local path]").slice(0, 300)
  return first || "The guided BitLocker operation failed; administrator access may be required"
}
