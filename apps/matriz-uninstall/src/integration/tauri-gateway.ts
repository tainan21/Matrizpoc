import { invoke } from "@tauri-apps/api/core"
import type {
  CleanupCandidate,
  DesktopGateway,
  InstalledProduct,
  OperationResult,
} from "../domain/types"
export const tauriGateway: DesktopGateway = {
  shell: "tauri",
  listInstalled: () => invoke<InstalledProduct[]>("list_installed"),
  install: (productId) => invoke<OperationResult>("install_product", { productId }),
  update: (productId) => invoke<OperationResult>("update_product", { productId }),
  reinstall: (productId, installationId) =>
    invoke<OperationResult>("reinstall_product", { productId, installationId }),
  uninstall: (installationId) => invoke<OperationResult>("uninstall_product", { installationId }),
  cleanupPreview: (productId) => invoke<CleanupCandidate[]>("cleanup_preview", { productId }),
  cleanup: (productId, candidateIds) =>
    invoke<OperationResult>("cleanup_product", { productId, candidateIds }),
  selfUninstall: () => invoke<OperationResult>("self_uninstall"),
  chooseLocalInstallerFolder: () => invoke("choose_local_installer_folder"),
  scanLocalInstallers: (folderId) => invoke("scan_local_installers", { folderId }),
  prepareInstaller: (source, action) => invoke("prepare_installer", { source, action }),
  confirmInstaller: (operationId, acknowledgements) => invoke("confirm_installer", { operationId, acknowledgements }),
  cancelInstaller: (operationId) => invoke("cancel_installer", { operationId }),
  installerOperation: (operationId) => invoke("installer_operation", { operationId }),
}
