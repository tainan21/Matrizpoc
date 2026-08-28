import type { DistributionProductInputV1 } from "@matriz/integration-api-contracts"
import { DistributionService } from "./distribution-service"

const actor = {
  userId: "system:distribution-bootstrap",
  capabilities: ["distribution.catalog.manage"],
}
const windows = (
  uninstallKey: string,
  displayName: string,
  executableName: string,
  aliases: string[] = [],
) => ({
  uninstallKey,
  displayName,
  publisher: "Matriz",
  executableName,
  aliases,
})

export const initialDistributionProducts: readonly DistributionProductInputV1[] = [
  {
    productId: "matriz-control-tauri",
    displayName: "Matriz Control",
    edition: "Tauri",
    runtime: "tauri",
    platform: "win32",
    arch: "x64",
    windows: windows("Matriz Control", "Matriz Control", "matriz-control.exe", [
      "Matriz Control 0.1.0",
    ]),
  },
  {
    productId: "matriz-control-electron",
    displayName: "Matriz Control",
    edition: "Electron",
    runtime: "electron",
    platform: "win32",
    arch: "x64",
    windows: windows(
      "9b8c8dfd-77ee-5d4b-b4b3-34afd8c1a76d",
      "Matriz Control 0.1.0",
      "Matriz Control.exe",
      ["Matriz Control"],
    ),
  },
  {
    productId: "matriz-admin-tauri",
    displayName: "Matriz Admin",
    edition: "Tauri",
    runtime: "tauri",
    platform: "win32",
    arch: "x64",
    windows: windows("Matriz Admin", "Matriz Admin", "matriz-admin-desktop.exe"),
  },
  {
    productId: "matriz-ops-tauri",
    displayName: "Matriz Ops",
    edition: "Tauri",
    runtime: "tauri",
    platform: "win32",
    arch: "x64",
    windows: windows("Matriz Ops", "Matriz Ops", "matriz-ops-desktop.exe"),
  },
  {
    productId: "seumei-electron",
    displayName: "Seumei",
    edition: "Electron",
    runtime: "electron",
    platform: "win32",
    arch: "x64",
    windows: windows("com.matriz.seumei", "Seumei", "Seumei.exe"),
  },
  {
    productId: "matriz-workbench-electron",
    displayName: "Matriz Workbench",
    edition: "Electron",
    runtime: "electron",
    platform: "win32",
    arch: "x64",
    windows: windows("com.matriz.workbench", "Matriz Workbench", "Matriz Workbench.exe"),
  },
  {
    productId: "matriz-pay",
    displayName: "Matriz Pay",
    edition: "Web",
    runtime: "web",
    platform: "win32",
    arch: "x64",
    windows: windows("Matriz Pay", "Matriz Pay", "Matriz Pay.exe"),
  },
  {
    productId: "matriz-uninstall-tauri",
    displayName: "Matriz Uninstall",
    edition: "Tauri",
    runtime: "tauri",
    platform: "win32",
    arch: "x64",
    windows: windows(
      "Matriz Uninstall Tauri",
      "Matriz Uninstall Tauri",
      "matriz-uninstall-tauri.exe",
    ),
  },
  {
    productId: "matriz-uninstall-electron",
    displayName: "Matriz Uninstall",
    edition: "Electron",
    runtime: "electron",
    platform: "win32",
    arch: "x64",
    windows: windows(
      "com.matriz.uninstall.electron",
      "Matriz Uninstall Electron",
      "Matriz Uninstall Electron.exe",
    ),
  },
]

export async function seedInitialDistributionCatalog(service: DistributionService): Promise<void> {
  for (const product of initialDistributionProducts) {
    if (!(await service.product(product.productId)))
      await service.createProduct(actor, product, `bootstrap:${product.productId}`)
  }
  await service.updateProduct(
    actor,
    "matriz-pay",
    { state: "unavailable" },
    "bootstrap:matriz-pay-state",
  )
}
