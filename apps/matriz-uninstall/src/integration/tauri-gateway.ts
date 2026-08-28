import { invoke } from "@tauri-apps/api/core"
import type { CleanupCandidate, DesktopGateway, InstalledProduct, OperationResult } from "../domain/types"
export const tauriGateway: DesktopGateway = {
  shell:"tauri",
  listInstalled:()=>invoke<InstalledProduct[]>("list_installed"),
  install:(productId)=>invoke<OperationResult>("install_product",{productId}),
  update:(productId)=>invoke<OperationResult>("update_product",{productId}),
  reinstall:(productId,installationId)=>invoke<OperationResult>("reinstall_product",{productId,installationId}),
  uninstall:(installationId)=>invoke<OperationResult>("uninstall_product",{installationId}),
  cleanupPreview:(productId)=>invoke<CleanupCandidate[]>("cleanup_preview",{productId}),
  cleanup:(productId,candidateIds)=>invoke<OperationResult>("cleanup_product",{productId,candidateIds}),
  selfUninstall:()=>invoke<OperationResult>("self_uninstall"),
}

