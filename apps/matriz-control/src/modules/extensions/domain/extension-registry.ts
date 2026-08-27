export type ExtensionPermission = "system.metrics.read" | "git.repository.read" | "git.repository.write"

export interface ExtensionNavigationItem { readonly id: string; readonly label: string; readonly path: string }
export interface ExtensionNavigationGroup { readonly id: string; readonly label: string; readonly items: readonly ExtensionNavigationItem[] }
export interface ExtensionWidget { readonly id: string; readonly label: string }

export interface ExtensionDefinition {
  readonly id: string
  readonly name: string
  readonly version: string
  readonly minimumControlVersion: string
  readonly publisher: string
  readonly description: string
  readonly permissions: readonly ExtensionPermission[]
  readonly dependencies: readonly string[]
  readonly contributions: {
    readonly navigation: readonly ExtensionNavigationGroup[]
    readonly widgets: readonly ExtensionWidget[]
    readonly doctorProviders: readonly string[]
  }
}

export interface ExtensionReceipt {
  readonly id: string
  readonly version: string
  readonly state: "installed-inactive" | "active"
  readonly grantedPermissions: readonly ExtensionPermission[]
  readonly installedAt: string
  readonly updatedAt: string
}

export interface ExtensionRegistry {
  readonly controlVersion: string
  readonly definitions: readonly ExtensionDefinition[]
  readonly receipts: readonly ExtensionReceipt[]
  readonly contributions: ExtensionDefinition["contributions"]
}

const emptyContributions = () => ({ navigation: [], widgets: [], doctorProviders: [] } satisfies ExtensionDefinition["contributions"])

export function createExtensionRegistry(definitions: readonly ExtensionDefinition[], controlVersion: string, receipts: readonly ExtensionReceipt[] = []): ExtensionRegistry {
  const ids = new Set<string>()
  for (const definition of definitions) {
    if (ids.has(definition.id)) throw new Error("Duplicate extension definition")
    ids.add(definition.id)
  }
  return derive({ controlVersion, definitions: [...definitions], receipts: [...receipts], contributions: emptyContributions() })
}

export function installExtension(registry: ExtensionRegistry, id: string, permissions: readonly string[], now: string): ExtensionRegistry {
  const definition = requireDefinition(registry, id)
  if (compareVersion(registry.controlVersion, definition.minimumControlVersion) < 0) throw new Error("Incompatible extension")
  if (definition.dependencies.some((dependency) => !registry.receipts.some((receipt) => receipt.id === dependency))) throw new Error("Missing extension dependency")
  if (permissions.some((permission) => !definition.permissions.includes(permission as ExtensionPermission))) throw new Error("Undeclared extension permission")
  const receipt: ExtensionReceipt = { id, version: definition.version, state: "installed-inactive", grantedPermissions: permissions as readonly ExtensionPermission[], installedAt: now, updatedAt: now }
  return derive({ ...registry, receipts: [...registry.receipts.filter((item) => item.id !== id), receipt] })
}

export function activateExtension(registry: ExtensionRegistry, id: string, now: string): ExtensionRegistry {
  return updateReceipt(registry, id, (receipt) => ({ ...receipt, state: "active", updatedAt: now }))
}

export function deactivateExtension(registry: ExtensionRegistry, id: string, now: string): ExtensionRegistry {
  return updateReceipt(registry, id, (receipt) => ({ ...receipt, state: "installed-inactive", updatedAt: now }))
}

export function uninstallExtension(registry: ExtensionRegistry, id: string): ExtensionRegistry {
  return derive({ ...registry, receipts: registry.receipts.filter((receipt) => receipt.id !== id) })
}

function updateReceipt(registry: ExtensionRegistry, id: string, update: (receipt: ExtensionReceipt) => ExtensionReceipt) {
  if (!registry.receipts.some((receipt) => receipt.id === id)) throw new Error("Extension is not installed")
  return derive({ ...registry, receipts: registry.receipts.map((receipt) => receipt.id === id ? update(receipt) : receipt) })
}

function derive(registry: ExtensionRegistry): ExtensionRegistry {
  const active = registry.receipts.filter((receipt) => receipt.state === "active").map((receipt) => requireDefinition(registry, receipt.id))
  return {
    ...registry,
    contributions: {
      navigation: active.flatMap((definition) => definition.contributions.navigation),
      widgets: active.flatMap((definition) => definition.contributions.widgets),
      doctorProviders: active.flatMap((definition) => definition.contributions.doctorProviders),
    },
  }
}

function requireDefinition(registry: ExtensionRegistry, id: string) {
  const definition = registry.definitions.find((item) => item.id === id)
  if (!definition) throw new Error("Unknown extension")
  return definition
}

function compareVersion(left: string, right: string) {
  const values = (value: string) => value.split("-")[0].split(".").map(Number)
  const [leftMajor = 0, leftMinor = 0, leftPatch = 0] = values(left)
  const [rightMajor = 0, rightMinor = 0, rightPatch = 0] = values(right)
  return leftMajor - rightMajor || leftMinor - rightMinor || leftPatch - rightPatch
}
