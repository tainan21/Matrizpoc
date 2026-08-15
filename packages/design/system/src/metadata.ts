import {
  DESIGN_SYSTEM_VERSION,
  componentTokenNames,
  semanticTokenNames,
  type ComponentTokenName,
  type SemanticTokenName,
} from "./tokens"

export interface MatrizTokenMetadataRecord {
  readonly name: SemanticTokenName | ComponentTokenName
  readonly layer: "semantic" | "component"
  readonly description: string
}

const semanticDescriptions: Readonly<Record<SemanticTokenName, string>> = {
  "--matriz-color-canvas": "Application canvas background.",
  "--matriz-color-surface": "Raised content surface.",
  "--matriz-color-text": "Primary readable text.",
  "--matriz-color-text-muted": "Secondary readable text.",
  "--matriz-color-border": "Default separating border.",
  "--matriz-color-action": "Primary interactive action.",
  "--matriz-color-action-text": "Text or icon placed on the primary action.",
  "--matriz-color-focus": "Keyboard focus indicator.",
  "--matriz-color-success": "Positive status.",
  "--matriz-color-warning": "Cautionary status.",
  "--matriz-color-danger": "Destructive or error status.",
  "--matriz-color-info": "Informational status.",
}

const componentDescriptions: Readonly<Record<ComponentTokenName, string>> = {
  "--matriz-focus-width": "Focus-ring width.",
  "--matriz-focus-offset": "Focus-ring offset.",
  "--matriz-font-sans": "Default sans-serif family.",
  "--matriz-font-mono": "Default monospace family.",
  "--matriz-space-1": "Extra-small spacing.",
  "--matriz-space-2": "Small spacing.",
  "--matriz-space-3": "Compact spacing.",
  "--matriz-space-4": "Default spacing.",
  "--matriz-space-6": "Comfortable spacing.",
  "--matriz-space-8": "Large spacing.",
  "--matriz-radius-sm": "Small corner radius.",
  "--matriz-radius-md": "Default corner radius.",
  "--matriz-radius-lg": "Large corner radius.",
  "--matriz-radius-full": "Pill or circular radius.",
  "--matriz-elevation-sm": "Subtle surface elevation.",
  "--matriz-elevation-md": "Floating surface elevation.",
  "--matriz-elevation-lg": "Overlay elevation.",
  "--matriz-motion-duration-fast": "Fast interaction duration.",
  "--matriz-motion-duration-base": "Default interaction duration.",
  "--matriz-motion-duration-slow": "Emphasized interaction duration.",
  "--matriz-motion-easing-standard": "Default interaction easing.",
}

export const matrizTokenMetadata: readonly MatrizTokenMetadataRecord[] = [
  ...semanticTokenNames.map((name) => ({ name, layer: "semantic" as const, description: semanticDescriptions[name] })),
  ...componentTokenNames.map((name) => ({ name, layer: "component" as const, description: componentDescriptions[name] })),
]

export const matrizTokenContract = {
  version: DESIGN_SYSTEM_VERSION,
  namespace: "--matriz-",
  tokens: matrizTokenMetadata,
} as const
