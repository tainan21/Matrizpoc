import { spawn } from "node:child_process"

export type TerminationInvocation =
  | { command: "taskkill.exe"; args: string[] }
  | { signalPid: number; signal: "SIGTERM" }

export function buildTerminationInvocation(
  pid: number,
  platform: NodeJS.Platform,
): TerminationInvocation {
  if (platform === "win32") {
    return { command: "taskkill.exe", args: ["/PID", String(pid), "/T", "/F"] }
  }
  return { signalPid: -pid, signal: "SIGTERM" }
}

export async function terminateProcessTree(pid: number): Promise<void> {
  const invocation = buildTerminationInvocation(pid, process.platform)
  if ("signalPid" in invocation) {
    try {
      process.kill(invocation.signalPid, invocation.signal)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error
    }
    return
  }
  await new Promise<void>((resolve, reject) => {
    const child = spawn(invocation.command, invocation.args, { stdio: "ignore", windowsHide: true })
    child.once("error", reject)
    child.once("exit", (code) => code === 0 || code === 128 ? resolve() : reject(new Error(`taskkill exited with code ${code}`)))
  })
}
