import type { ComponentMetadata } from "@matriz/design-ui/metadata"

type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
type NonZeroDigit = Exclude<Digit, "0">

export type ComponentCatalogId = `C00${NonZeroDigit}` | `C0${NonZeroDigit}${Digit}`

export type ComponentCatalogCategory =
  | "layout"
  | "content"
  | "input"
  | "feedback"
  | "context"
  | "navigation"
  | "overlay"
  | "data-display"
  | "accessibility"
  | "identity"

export type ComponentCatalogStage = "available" | "candidate"
export type ComponentCatalogQualification = "qualified" | "backlog"

interface ComponentCatalogEntryBase {
  readonly id: ComponentCatalogId
  readonly name: string
  readonly slug: string
  readonly category: ComponentCatalogCategory
  readonly qualification: ComponentCatalogQualification
  readonly hasAuditedPublicExport: boolean
  readonly description: string
  readonly evidence: string
  readonly potentialConsumers: string
  readonly domainBoundary: string
}

export interface AvailableComponentCatalogEntry extends ComponentCatalogEntryBase {
  readonly stage: "available"
  readonly importPath: "@matriz/design-ui"
  readonly packageMetadata: ComponentMetadata
}

export interface CandidateComponentCatalogEntry extends ComponentCatalogEntryBase {
  readonly stage: "candidate"
  readonly importPath?: never
  readonly packageMetadata?: never
}

export type ComponentCatalogEntry =
  | AvailableComponentCatalogEntry
  | CandidateComponentCatalogEntry
