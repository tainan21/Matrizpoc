import type {
  DistributionCatalogV1,
  DistributionProductV1,
} from "@matriz/integration-api-contracts"

export type { DistributionCatalogV1, DistributionProductV1 }
export type ProductStatus = "installed" | "outdated" | "available" | "unavailable" | "inconsistent"
export type ProductAction = "install" | "update" | "reinstall" | "uninstall" | "cleanup"

export interface InstalledProduct {
  readonly installationId: string
  readonly registryKey: string
  readonly displayName: string
  readonly publisher: string
  readonly version: string | null
  readonly installLocation: string | null
  readonly estimatedBytes: number
}

export interface ProductViewModel {
  readonly productId: string
  readonly title: string
  readonly runtime: DistributionProductV1["runtime"]
  readonly status: ProductStatus
  readonly statusLabel: string
  readonly installedVersion: string | null
  readonly availableVersion: string | null
  readonly installationId: string | null
  readonly installLocation: string | null
  readonly estimatedBytes: number
  readonly trust: "stable-signed" | "local-development" | "not-published"
  readonly actions: readonly ProductAction[]
}

export interface CleanupCandidate {
  readonly id: string
  readonly category: "cache" | "logs" | "temporary"
  readonly displayPath: string
  readonly estimatedBytes: number
}

export interface OperationResult {
  readonly operationId: string
  readonly status: "completed" | "cancelled" | "failed"
  readonly message: string
}

export type InstallerOperationPhase = "queued" | "downloading" | "validating" | "awaiting_confirmation" | "installing" | "reinspecting" | "completed" | "cancelled" | "failed"
export type InstallerSource = { readonly kind: "remote"; readonly productId: string } | { readonly kind: "local"; readonly installerId: string }
export type InstallerAction = "install" | "update" | "reinstall" | "migrate"
export interface LocalInstallerViewModel {
  readonly installerId: string
  readonly productId: string
  readonly displayName: string
  readonly version: string
  readonly sizeBytes: number
  readonly sha256: string
  readonly trust: "signed-matriz" | "unsigned-development" | "blocked"
  readonly isLatestForProduct: boolean
  readonly isDowngrade: boolean
  readonly message: string
}
export interface InstallerOperationSnapshot {
  readonly operationId: string
  readonly productId: string
  readonly version: string
  readonly phase: InstallerOperationPhase
  readonly bytesDownloaded: number
  readonly totalBytes: number | null
  readonly requiredAcknowledgements: readonly ("unsigned-development" | "downgrade" | "edition-migration")[]
  readonly message: string
}

export interface DesktopGateway {
  readonly shell: "tauri" | "electron" | "browser"
  listInstalled(): Promise<readonly InstalledProduct[]>
  install(productId: string): Promise<OperationResult>
  update(productId: string): Promise<OperationResult>
  reinstall(productId: string, installationId: string): Promise<OperationResult>
  uninstall(installationId: string): Promise<OperationResult>
  cleanupPreview(productId: string): Promise<readonly CleanupCandidate[]>
  cleanup(productId: string, candidateIds: readonly string[]): Promise<OperationResult>
  selfUninstall(): Promise<OperationResult>
  chooseLocalInstallerFolder(): Promise<{ folderId: string; label: string } | null>
  scanLocalInstallers(folderId: string): Promise<readonly LocalInstallerViewModel[]>
  prepareInstaller(source: InstallerSource, action: InstallerAction): Promise<InstallerOperationSnapshot>
  confirmInstaller(operationId: string, acknowledgements: readonly string[]): Promise<InstallerOperationSnapshot>
  cancelInstaller(operationId: string): Promise<InstallerOperationSnapshot>
  installerOperation(operationId: string): Promise<InstallerOperationSnapshot>
}
