import type { DesktopGateway, OperationResult } from "../domain/types"
const unavailable = async (): Promise<OperationResult> => ({
  operationId: "browser",
  status: "failed",
  message: "Abra uma edição Windows do Matriz Uninstall para executar esta operação.",
})
export const browserGateway: DesktopGateway = {
  shell: "browser",
  listInstalled: async () => [],
  install: unavailable,
  update: unavailable,
  reinstall: unavailable,
  uninstall: unavailable,
  cleanupPreview: async () => [],
  cleanup: unavailable,
  selfUninstall: unavailable,
  chooseLocalInstallerFolder: async () => null,
  scanLocalInstallers: async () => [],
  prepareInstaller: async (source) => ({ operationId: "browser", productId: source.kind === "remote" ? source.productId : "unknown", version: "0.0.0", phase: "failed", bytesDownloaded: 0, totalBytes: null, requiredAcknowledgements: [], message: "Abra uma edição Windows para preparar instaladores." }),
  confirmInstaller: async () => ({ operationId: "browser", productId: "unknown", version: "0.0.0", phase: "failed", bytesDownloaded: 0, totalBytes: null, requiredAcknowledgements: [], message: "Abra uma edição Windows para instalar." }),
  cancelInstaller: async () => ({ operationId: "browser", productId: "unknown", version: "0.0.0", phase: "cancelled", bytesDownloaded: 0, totalBytes: null, requiredAcknowledgements: [], message: "Operação cancelada." }),
  installerOperation: async () => ({ operationId: "browser", productId: "unknown", version: "0.0.0", phase: "failed", bytesDownloaded: 0, totalBytes: null, requiredAcknowledgements: [], message: "Operação indisponível." }),
}
