import { realpath, stat } from "node:fs/promises"
import path from "node:path"

export interface NativeWorkspaceBindingStore {
  read(): Promise<string | undefined>
  write(root: string): Promise<void>
}

export interface NativeWorkspaceBindingInput {
  controlRoot?: string
  bindingStore: NativeWorkspaceBindingStore
  validateRoot?: (root: string) => Promise<boolean>
  canonicalizeRoot?: (root: string) => Promise<string>
  pickFolder: () => Promise<string | undefined>
}

export interface NativeWorkspaceBinding {
  root: string
  source: "control" | "persisted" | "picker"
}

async function existsDirectory(target: string): Promise<boolean> {
  try {
    return (await stat(target)).isDirectory()
  } catch {
    return false
  }
}

async function existsFile(target: string): Promise<boolean> {
  try {
    return (await stat(target)).isFile()
  } catch {
    return false
  }
}

export async function isValidMatrizWorkspaceRoot(root: string): Promise<boolean> {
  if (!root.trim() || !path.isAbsolute(root)) return false
  try {
    const physicalRoot = await realpath(root)
    return await existsFile(path.join(physicalRoot, "pnpm-workspace.yaml"))
      && await existsDirectory(path.join(physicalRoot, "apps"))
      && await existsFile(path.join(physicalRoot, "apps", "matriz-workbench", "package.json"))
  } catch {
    return false
  }
}

export async function resolveNativeWorkspaceBinding(
  input: NativeWorkspaceBindingInput,
): Promise<NativeWorkspaceBinding> {
  const validateRoot = input.validateRoot ?? isValidMatrizWorkspaceRoot
  const canonicalizeRoot = input.canonicalizeRoot ?? (input.validateRoot ? async (root: string) => root : realpath)
  const canonicalValidRoot = async (root: string): Promise<string | undefined> => {
    try {
      const canonical = await canonicalizeRoot(root)
      return await validateRoot(canonical) ? canonical : undefined
    } catch { return undefined }
  }
  if (input.controlRoot) {
    const canonical = await canonicalValidRoot(input.controlRoot)
    if (!canonical) {
      throw new Error("A raiz fornecida pelo Control não é um workspace Matriz válido.")
    }
    return { root: canonical, source: "control" }
  }

  const persistedRoot = await input.bindingStore.read()
  const canonicalPersisted = persistedRoot ? await canonicalValidRoot(persistedRoot) : undefined
  if (canonicalPersisted) {
    if (canonicalPersisted !== persistedRoot) await input.bindingStore.write(canonicalPersisted)
    return { root: canonicalPersisted, source: "persisted" }
  }

  const selectedRoot = await input.pickFolder()
  const canonicalSelected = selectedRoot ? await canonicalValidRoot(selectedRoot) : undefined
  if (!canonicalSelected) {
    throw new Error("A pasta selecionada não é um workspace Matriz válido.")
  }
  await input.bindingStore.write(canonicalSelected)
  return { root: canonicalSelected, source: "picker" }
}
