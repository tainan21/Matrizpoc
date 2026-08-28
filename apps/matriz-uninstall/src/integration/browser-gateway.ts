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
}
