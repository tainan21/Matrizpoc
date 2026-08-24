import {
  useSyncExternalStore,
  type HTMLAttributes,
  type PropsWithChildren,
} from "react"
import {
  DocsContainer,
  type DocsContainerProps,
} from "@storybook/addon-docs/blocks"

export interface CatalogGlobals extends Record<string, unknown> {
  readonly theme: "light" | "dark"
  readonly density: "comfortable" | "compact"
  readonly motion: "full" | "reduced"
}

const defaultCatalogGlobals: CatalogGlobals = {
  theme: "light",
  density: "comfortable",
  motion: "full",
}

let catalogGlobals = defaultCatalogGlobals
const subscribers = new Set<() => void>()

function normalizeCatalogGlobals(globals: Record<string, unknown>): CatalogGlobals {
  return {
    theme: globals.theme === "dark" ? "dark" : "light",
    density: globals.density === "compact" ? "compact" : "comfortable",
    motion: globals.motion === "reduced" ? "reduced" : "full",
  }
}

export function publishCatalogGlobals(globals: Record<string, unknown>) {
  const next = normalizeCatalogGlobals(globals)
  if (
    next.theme === catalogGlobals.theme &&
    next.density === catalogGlobals.density &&
    next.motion === catalogGlobals.motion
  ) {
    return
  }

  catalogGlobals = next
  subscribers.forEach((subscriber) => subscriber())
}

function subscribeToCatalogGlobals(subscriber: () => void) {
  subscribers.add(subscriber)
  return () => subscribers.delete(subscriber)
}

function getCatalogGlobals() {
  return catalogGlobals
}

interface CatalogEnvironmentProps
  extends PropsWithChildren<Pick<HTMLAttributes<HTMLDivElement>, "className">> {
  globals: Record<string, unknown>
}

export function CatalogEnvironment({
  globals,
  className,
  children,
}: CatalogEnvironmentProps) {
  const resolved = normalizeCatalogGlobals(globals)

  return (
    <div
      className={className}
      data-matrizlib=""
      data-theme={resolved.theme}
      data-density={resolved.density}
      data-motion={resolved.motion}
    >
      {children}
    </div>
  )
}

export function CatalogGlobalsEnvironment({ children }: PropsWithChildren) {
  const globals = useSyncExternalStore(
    subscribeToCatalogGlobals,
    getCatalogGlobals,
    getCatalogGlobals,
  )

  return (
    <CatalogEnvironment globals={globals} className="catalog-docs-environment">
      {children}
    </CatalogEnvironment>
  )
}

export function CatalogDocsContainer({
  context,
  theme,
  children,
}: PropsWithChildren<DocsContainerProps>) {
  return (
    <DocsContainer context={context} theme={theme}>
      <CatalogGlobalsEnvironment>{children}</CatalogGlobalsEnvironment>
    </DocsContainer>
  )
}
