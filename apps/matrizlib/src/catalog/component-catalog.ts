import { componentMetadata } from "@matriz/design-ui/metadata"
import type {
  ComponentCatalogCategory,
  ComponentCatalogEntry,
  ComponentCatalogId,
  ComponentCatalogQualification,
} from "./types"

type AuditGroup =
  | "structure"
  | "typography"
  | "field"
  | "feedback"
  | "theme"
  | "navigation"
  | "validation"
  | "state"
  | "overlay"
  | "data"
  | "shell"
  | "accessibility"
  | "identity"

interface AuditFacts {
  readonly potentialConsumers: string
  readonly domainBoundary: string
}

const auditFacts: Record<AuditGroup, AuditFacts> = {
  structure: {
    potentialConsumers: "Apps Contracts, Seumei, Spot and WillDash, subject to audited usage.",
    domainBoundary: "Structure, tokens and children only; no route, data or product domain.",
  },
  typography: {
    potentialConsumers: "Apps with audited typography and visual-action usage.",
    domainBoundary: "Typography or visual action only; no business rule.",
  },
  field: {
    potentialConsumers: "Audited forms across Contracts, Seumei, Sites, Spot and WillDash.",
    domainBoundary: "Field semantics and local interaction; no submit, auth or persistence.",
  },
  feedback: {
    potentialConsumers: "Audited state presentation across Contracts, Seumei, Spot and WillDash.",
    domainBoundary: "Presents state received through props; it does not decide product rules.",
  },
  theme: {
    potentialConsumers: "Login, shell and theme surfaces in the audited applications.",
    domainBoundary: "Composition and theme through props; no session, registry or authorization.",
  },
  navigation: {
    potentialConsumers: "Authenticated shells and routes; a second equivalent use remains to be proven.",
    domainBoundary: "Visual navigation from supplied items and links; no router or permissions.",
  },
  validation: {
    potentialConsumers: "Login flows and local actions; an independent real case remains to be proven.",
    domainBoundary: "Visual field and validation behavior; no product schema, submit or API.",
  },
  state: {
    potentialConsumers: "Empty and feedback states in gigs, establishments and telemetry routes.",
    domainBoundary: "UI feedback and state only; no retries, fetch or product domain.",
  },
  overlay: {
    potentialConsumers: "Actions for gigs, establishments or goals; independent cases remain unproven.",
    domainBoundary: "Focus, opening and local composition; no product action.",
  },
  data: {
    potentialConsumers: "Lists, metrics, goals and activity views; no common component is proven.",
    domainBoundary: "Renders prepared view models; no entities, repositories, search or telemetry.",
  },
  shell: {
    potentialConsumers: "Application layouts and shells; an equal pattern in two consumers is unproven.",
    domainBoundary: "Layout and navigation through props; no application knowledge.",
  },
  accessibility: {
    potentialConsumers: "Any accessible route; no canonical same-named export or use is proven.",
    domainBoundary: "Accessibility or visual utility only; no product state.",
  },
  identity: {
    potentialConsumers: "Login, shell or theme surfaces; no canonical same-named export or use is proven.",
    domainBoundary: "Identity, tenant or theme visuals through props; no session, tenant data or registry.",
  },
}

type AuditedComponent = readonly [
  id: ComponentCatalogId,
  name: string,
  category: ComponentCatalogCategory,
  group: AuditGroup,
]

const auditedComponents = [
  ["C001", "Stack", "layout", "structure"],
  ["C002", "Inline", "layout", "structure"],
  ["C003", "Container", "layout", "structure"],
  ["C004", "Surface", "layout", "structure"],
  ["C005", "Card", "layout", "structure"],
  ["C006", "CardHeader", "layout", "structure"],
  ["C007", "CardTitle", "layout", "structure"],
  ["C008", "CardDescription", "layout", "structure"],
  ["C009", "Heading", "content", "typography"],
  ["C010", "Text", "content", "typography"],
  ["C011", "Button", "input", "typography"],
  ["C012", "Label", "input", "field"],
  ["C013", "Input", "input", "field"],
  ["C014", "FormField", "input", "field"],
  ["C015", "Badge", "feedback", "feedback"],
  ["C016", "Alert", "feedback", "feedback"],
  ["C017", "EmptyState", "feedback", "feedback"],
  ["C018", "InfoHint", "feedback", "feedback"],
  ["C019", "ThemeController", "context", "theme"],
  ["C020", "ThemeToggle", "context", "theme"],
  ["C021", "MatrizAuthLayout", "context", "theme"],
  ["C022", "EcosystemBar", "context", "theme"],
  ["C023", "PageHeader", "navigation", "navigation"],
  ["C024", "SectionHeader", "navigation", "navigation"],
  ["C025", "Toolbar", "navigation", "navigation"],
  ["C026", "Breadcrumbs", "navigation", "navigation"],
  ["C027", "Tabs", "navigation", "navigation"],
  ["C028", "TabList", "navigation", "navigation"],
  ["C029", "Tab", "navigation", "navigation"],
  ["C030", "LinkButton", "navigation", "navigation"],
  ["C031", "IconButton", "navigation", "navigation"],
  ["C032", "ButtonGroup", "navigation", "navigation"],
  ["C033", "MenuButton", "navigation", "navigation"],
  ["C034", "ActionMenu", "navigation", "navigation"],
  ["C035", "SearchField", "input", "validation"],
  ["C036", "SelectField", "input", "validation"],
  ["C037", "TextareaField", "input", "validation"],
  ["C038", "CheckboxField", "input", "validation"],
  ["C039", "RadioGroup", "input", "validation"],
  ["C040", "Switch", "input", "validation"],
  ["C041", "FormActions", "input", "validation"],
  ["C042", "Fieldset", "input", "validation"],
  ["C043", "InlineError", "input", "validation"],
  ["C044", "ValidationSummary", "input", "validation"],
  ["C045", "Notice", "feedback", "state"],
  ["C046", "StatusPill", "feedback", "state"],
  ["C047", "StatusDot", "feedback", "state"],
  ["C048", "ProgressBar", "feedback", "state"],
  ["C049", "Skeleton", "feedback", "state"],
  ["C050", "Spinner", "feedback", "state"],
  ["C051", "LoadingBoundary", "feedback", "state"],
  ["C052", "ErrorState", "feedback", "state"],
  ["C053", "NotFoundState", "feedback", "state"],
  ["C054", "RetryButton", "feedback", "state"],
  ["C055", "ConfirmDialog", "overlay", "overlay"],
  ["C056", "Drawer", "overlay", "overlay"],
  ["C057", "Dialog", "overlay", "overlay"],
  ["C058", "Popover", "overlay", "overlay"],
  ["C059", "Tooltip", "overlay", "overlay"],
  ["C060", "DataTable", "data-display", "data"],
  ["C061", "TableToolbar", "data-display", "data"],
  ["C062", "TablePagination", "data-display", "data"],
  ["C063", "SortButton", "data-display", "data"],
  ["C064", "FilterChip", "data-display", "data"],
  ["C065", "FilterBar", "data-display", "data"],
  ["C066", "List", "data-display", "data"],
  ["C067", "ListItem", "data-display", "data"],
  ["C068", "EntityRow", "data-display", "data"],
  ["C069", "EntityIdentity", "data-display", "data"],
  ["C070", "EntityMeta", "data-display", "data"],
  ["C071", "EntityActions", "data-display", "data"],
  ["C072", "MetricCard", "data-display", "data"],
  ["C073", "MetricGrid", "data-display", "data"],
  ["C074", "Stat", "data-display", "data"],
  ["C075", "KpiDelta", "data-display", "data"],
  ["C076", "Timeline", "data-display", "data"],
  ["C077", "TimelineItem", "data-display", "data"],
  ["C078", "ActivityFeed", "data-display", "data"],
  ["C079", "EventRow", "data-display", "data"],
  ["C080", "AuditLog", "data-display", "data"],
  ["C081", "EmptyTable", "layout", "shell"],
  ["C082", "CardGrid", "layout", "shell"],
  ["C083", "ResponsiveGrid", "layout", "shell"],
  ["C084", "SplitPane", "layout", "shell"],
  ["C085", "SideNav", "layout", "shell"],
  ["C086", "TopNav", "layout", "shell"],
  ["C087", "CommandPalette", "accessibility", "accessibility"],
  ["C088", "SkipLink", "accessibility", "accessibility"],
  ["C089", "FocusTrap", "accessibility", "accessibility"],
  ["C090", "VisuallyHidden", "accessibility", "accessibility"],
  ["C091", "LiveRegion", "accessibility", "accessibility"],
  ["C092", "Announcer", "accessibility", "accessibility"],
  ["C093", "ScrollArea", "accessibility", "accessibility"],
  ["C094", "Separator", "accessibility", "accessibility"],
  ["C095", "Avatar", "identity", "identity"],
  ["C096", "AvatarGroup", "identity", "identity"],
  ["C097", "LogoMark", "identity", "identity"],
  ["C098", "AppSwitcher", "identity", "identity"],
  ["C099", "TenantSwitcher", "identity", "identity"],
] as const satisfies readonly AuditedComponent[]

const qualifiedIds = new Set<ComponentCatalogId>([
  "C001",
  "C003",
  "C004",
  "C005",
  "C006",
  "C007",
  "C008",
  "C009",
  "C010",
  "C011",
  "C012",
  "C013",
  "C015",
  "C016",
  "C017",
  "C019",
  "C020",
])

const auditedExistingExportIds = new Set<ComponentCatalogId>(
  Array.from({ length: 22 }, (_, index) => `C${String(index + 1).padStart(3, "0")}` as ComponentCatalogId),
)

const metadataByName = new Map<string, (typeof componentMetadata)[number]>(
  componentMetadata.map((metadata) => [metadata.name, metadata]),
)

function toSlug(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()
}

function qualificationFor(id: ComponentCatalogId): ComponentCatalogQualification {
  return qualifiedIds.has(id) ? "qualified" : "backlog"
}

function evidenceFor(id: ComponentCatalogId, hasCanonicalMetadata: boolean): string {
  if (hasCanonicalMetadata) {
    return "Public component metadata exists and the audit records an existing @matriz/design-ui export."
  }

  if (auditedExistingExportIds.has(id)) {
    return "The audit records an existing export, but it is absent from the current public component metadata contract."
  }

  return "The audit found no canonical @matriz/design-ui export or same-named component in the audited apps."
}

function createCatalogEntry([
  id,
  name,
  category,
  group,
]: AuditedComponent): ComponentCatalogEntry {
  const packageMetadata = metadataByName.get(name)
  const facts = auditFacts[group]
  const shared = {
    id,
    name,
    slug: toSlug(name),
    category,
    qualification: qualificationFor(id),
    hasAuditedPublicExport: auditedExistingExportIds.has(id),
    evidence: evidenceFor(id, Boolean(packageMetadata)),
    potentialConsumers: facts.potentialConsumers,
    domainBoundary: facts.domainBoundary,
  } as const

  if (packageMetadata) {
    return {
      ...shared,
      stage: "available",
      importPath: "@matriz/design-ui",
      description: packageMetadata.description,
      packageMetadata,
    }
  }

  return {
    ...shared,
    stage: "candidate",
    description:
      "Candidate documented by the audited inventory; no canonical component metadata contract is published.",
  }
}

export const componentCatalog: readonly ComponentCatalogEntry[] = auditedComponents.map(
  createCatalogEntry,
)
