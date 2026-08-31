import type { LocalInstallerViewModel } from "../domain/types"

interface InspectedInstaller {
  readonly installerId?: string
  readonly fileName: string
  readonly sizeBytes: number
  readonly sha256: string
  readonly signed: boolean
}

const products = [
  ["matriz-control-tauri", /^matriz-control-(\d+\.\d+\.\d+)-windows-x64-setup\.exe$/i, "Matriz Control"],
  ["matriz-control-electron", /^matriz-control-electron-(\d+\.\d+\.\d+)-windows-x64-setup\.exe$/i, "Matriz Control Electron"],
  ["matriz-admin-tauri", /^matriz-admin-(\d+\.\d+\.\d+)-windows-x64-setup\.exe$/i, "Matriz Admin"],
  ["matriz-ops-tauri", /^matriz-ops-(\d+\.\d+\.\d+)-windows-x64-setup\.exe$/i, "Matriz Ops"],
  ["matriz-uninstall-tauri", /^matriz-uninstall-(\d+\.\d+\.\d+)-windows-x64-setup\.exe$/i, "Matriz Uninstall"],
  ["matriz-uninstall-electron", /^matriz-uninstall-electron-(\d+\.\d+\.\d+)-windows-x64-setup\.exe$/i, "Matriz Uninstall Electron"],
  ["matriz-workbench-electron", /^matriz-workbench-(\d+\.\d+\.\d+)-windows-x64-setup\.exe$/i, "Matriz Workbench"],
  ["seumei-electron", /^seumei-(\d+\.\d+\.\d+)-windows-x64-setup\.exe$/i, "Seumei"],
] as const

export function classifyLocalInstallers(input: readonly InspectedInstaller[]): LocalInstallerViewModel[] {
  const classified = input.map((item) => {
    const definition = products.find(([, pattern]) => pattern.test(item.fileName))
    const match = definition?.[1].exec(item.fileName)
    if (!definition || !match?.[1]) return blocked(item)
    return {
      installerId: item.installerId ?? item.sha256.slice(0, 24),
      productId: definition[0],
      displayName: definition[2],
      version: match[1],
      sizeBytes: item.sizeBytes,
      sha256: item.sha256,
      trust: item.signed ? "signed-matriz" as const : "unsigned-development" as const,
      isLatestForProduct: false,
      isDowngrade: false,
      message: item.signed ? "Assinatura Matriz válida." : "Build local de desenvolvimento não assinado.",
    }
  })
  const latest = new Map<string, string>()
  for (const item of classified) {
    if (item.trust === "blocked") continue
    const current = latest.get(item.productId)
    if (!current || compareSemver(item.version, current) > 0) latest.set(item.productId, item.version)
  }
  return classified
    .map((item) => ({ ...item, isLatestForProduct: item.trust !== "blocked" && latest.get(item.productId) === item.version }))
    .sort((left, right) => left.productId.localeCompare(right.productId) || compareSemver(right.version, left.version))
}

function blocked(item: InspectedInstaller): LocalInstallerViewModel {
  return {
    installerId: item.installerId ?? item.sha256.slice(0, 24), productId: "unknown",
    displayName: item.fileName, version: "0.0.0", sizeBytes: item.sizeBytes, sha256: item.sha256,
    trust: "blocked", isLatestForProduct: false, isDowngrade: false,
    message: "Arquivo não corresponde a um produto Matriz permitido.",
  }
}

function compareSemver(left: string, right: string) {
  const values = (value: string) => value.split(".").map(Number)
  const [l1 = 0, l2 = 0, l3 = 0] = values(left)
  const [r1 = 0, r2 = 0, r3 = 0] = values(right)
  return l1 - r1 || l2 - r2 || l3 - r3
}
