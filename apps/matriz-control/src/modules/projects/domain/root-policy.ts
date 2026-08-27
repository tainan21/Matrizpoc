import { isAbsolute, normalize, parse, relative, resolve, sep } from "node:path"

export type RootPolicyContext = Readonly<{
  homeDirectory: string
  windowsDirectory: string
  programFilesDirectories: readonly string[]
}>

function normalizedKey(path: string): string {
  const normalized = normalize(resolve(path)).replace(/[\\/]+$/, "")
  return normalized.toLocaleLowerCase("en-US")
}

function isSameOrInside(parent: string, child: string): boolean {
  const rel = relative(parent, child)
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel))
}

export function canonicalRootKey(path: string): string {
  return normalizedKey(path)
}

export function assertAllowedCanonicalRoot(path: string, context: RootPolicyContext): string {
  const canonical = normalize(resolve(path)).replace(/[\\/]+$/, "") || parse(path).root
  const key = normalizedKey(canonical)
  const rootKey = normalizedKey(parse(canonical).root)
  const protectedTrees = [context.windowsDirectory, ...context.programFilesDirectories].map((item) => normalize(resolve(item)))
  const sensitive = [
    resolve(context.homeDirectory, ".ssh"),
    resolve(context.homeDirectory, ".gnupg"),
    resolve(context.homeDirectory, ".aws"),
    resolve(context.homeDirectory, ".azure"),
    resolve(context.homeDirectory, "AppData", "Roaming", "Microsoft", "Credentials"),
  ]
  if (key === rootKey || key === normalizedKey(context.homeDirectory) || protectedTrees.some((item) => isSameOrInside(item, canonical)) || sensitive.some((item) => isSameOrInside(item, canonical))) {
    throw new Error("Project root is too broad or sensitive")
  }
  return canonical
}
