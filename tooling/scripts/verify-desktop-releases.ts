import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

interface Target { app: string; version: string; config: string; identity: string; workflow: string; tag: string }
const targets: readonly Target[] = [
  { app: "matriz-desktop", version: "1.0.0", config: "apps/matriz-desktop/src-tauri/tauri.conf.json", identity: "com.matriz.control", workflow: ".github/workflows/matriz-control-tauri-windows-release.yml", tag: "control-v*" },
  { app: "matriz-control", version: "0.2.0", config: "apps/matriz-control/package.json", identity: "com.matriz.control.electron", workflow: ".github/workflows/matriz-control-windows-release.yml", tag: "control-electron-v*" },
  { app: "matriz-admin", version: "0.1.0", config: "apps/matriz-admin/desktop/src-tauri/tauri.conf.json", identity: "com.matriz.admin", workflow: ".github/workflows/matriz-admin-windows-release.yml", tag: "admin-v*" },
  { app: "matriz-client-admin", version: "0.1.0", config: "apps/matriz-client-admin/desktop/src-tauri/tauri.conf.json", identity: "com.matriz.clientadmin", workflow: ".github/workflows/matriz-client-admin-windows-release.yml", tag: "client-admin-v*" },
  { app: "matriz-ops", version: "0.1.0", config: "apps/matriz-ops/desktop/src-tauri/tauri.conf.json", identity: "com.matriz.ops", workflow: ".github/workflows/matriz-ops-windows-release.yml", tag: "ops-v*" },
  { app: "matriz-uninstall", version: "0.2.0", config: "apps/matriz-uninstall/desktop/tauri/src-tauri/tauri.conf.json", identity: "com.matriz.uninstall.tauri", workflow: ".github/workflows/matriz-uninstall-windows.yml", tag: "uninstall-v*" },
  { app: "matriz-uninstall", version: "0.2.0", config: "apps/matriz-uninstall/package.json", identity: "com.matriz.uninstall.electron", workflow: ".github/workflows/matriz-uninstall-electron-windows-release.yml", tag: "uninstall-electron-v*" },
  { app: "matriz-workbench", version: "0.1.0", config: "apps/matriz-workbench/electron-builder.config.cjs", identity: "com.matriz.workbench", workflow: ".github/workflows/workbench-windows-release.yml", tag: "workbench-v*" },
  { app: "seumeiapp", version: "0.1.0", config: "apps/seumeiapp/desktop/electron-builder.yml", identity: "com.matriz.seumei", workflow: ".github/workflows/seumei-windows-release.yml", tag: "seumei-v*" },
]

export function verifyDesktopReleaseMatrix(root: string): string[] {
  const errors: string[] = []
  for (const target of targets) {
    const packageText = read(root, `apps/${target.app}/package.json`, errors)
    const manifestText = read(root, `apps/${target.app}/src/manifest/manifest.ts`, errors)
    const configText = read(root, target.config, errors)
    const workflowText = read(root, target.workflow, errors)
    if (packageText && JSON.parse(packageText).version !== target.version) errors.push(`${target.app}: package version must be ${target.version}`)
    if (manifestText && !new RegExp(`version:\\s*["']${escape(target.version)}["']`).test(manifestText)) errors.push(`${target.app}: manifest version must be ${target.version}`)
    if (configText && !configText.includes(target.identity)) errors.push(`${target.app}: missing Windows identity ${target.identity}`)
    if (workflowText && !workflowText.includes(target.tag)) errors.push(`${target.app}: workflow must use ${target.tag}`)
  }
  return errors
}

function read(root: string, path: string, errors: string[]) { const file=join(root,path); if(!existsSync(file)){errors.push(`missing ${path}`);return ""} return readFileSync(file,"utf8") }
function escape(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") }

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const errors = verifyDesktopReleaseMatrix(process.cwd())
  if (errors.length) { console.error(errors.join("\n")); process.exitCode = 1 }
  else console.log("Desktop release matrix is coherent.")
}
