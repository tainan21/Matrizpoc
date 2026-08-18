import * as designUi from "@matriz/design-ui"
import { describe, expect, expectTypeOf, it } from "vitest"
import { componentCatalog } from "./component-catalog"
import type { ComponentCatalogId } from "./types"

const auditedNames = [
  "Stack",
  "Inline",
  "Container",
  "Surface",
  "Card",
  "CardHeader",
  "CardTitle",
  "CardDescription",
  "Heading",
  "Text",
  "Button",
  "Label",
  "Input",
  "FormField",
  "Badge",
  "Alert",
  "EmptyState",
  "InfoHint",
  "ThemeController",
  "ThemeToggle",
  "MatrizAuthLayout",
  "EcosystemBar",
  "PageHeader",
  "SectionHeader",
  "Toolbar",
  "Breadcrumbs",
  "Tabs",
  "TabList",
  "Tab",
  "LinkButton",
  "IconButton",
  "ButtonGroup",
  "MenuButton",
  "ActionMenu",
  "SearchField",
  "SelectField",
  "TextareaField",
  "CheckboxField",
  "RadioGroup",
  "Switch",
  "FormActions",
  "Fieldset",
  "InlineError",
  "ValidationSummary",
  "Notice",
  "StatusPill",
  "StatusDot",
  "ProgressBar",
  "Skeleton",
  "Spinner",
  "LoadingBoundary",
  "ErrorState",
  "NotFoundState",
  "RetryButton",
  "ConfirmDialog",
  "Drawer",
  "Dialog",
  "Popover",
  "Tooltip",
  "DataTable",
  "TableToolbar",
  "TablePagination",
  "SortButton",
  "FilterChip",
  "FilterBar",
  "List",
  "ListItem",
  "EntityRow",
  "EntityIdentity",
  "EntityMeta",
  "EntityActions",
  "MetricCard",
  "MetricGrid",
  "Stat",
  "KpiDelta",
  "Timeline",
  "TimelineItem",
  "ActivityFeed",
  "EventRow",
  "AuditLog",
  "EmptyTable",
  "CardGrid",
  "ResponsiveGrid",
  "SplitPane",
  "SideNav",
  "TopNav",
  "CommandPalette",
  "SkipLink",
  "FocusTrap",
  "VisuallyHidden",
  "LiveRegion",
  "Announcer",
  "ScrollArea",
  "Separator",
  "Avatar",
  "AvatarGroup",
  "LogoMark",
  "AppSwitcher",
  "TenantSwitcher",
] as const

const canonicalMetadataNames = [
  "Stack",
  "Inline",
  "Container",
  "Surface",
  "Heading",
  "Text",
  "Button",
  "Label",
  "Input",
  "FormField",
  "Badge",
  "Alert",
  "EmptyState",
  "InfoHint",
] as const

describe("componentCatalog integrity", () => {
  it("models only zero-padded IDs inside the C001-C099 release contract", () => {
    expectTypeOf<"C001">().toMatchTypeOf<ComponentCatalogId>()
    expectTypeOf<"C099">().toMatchTypeOf<ComponentCatalogId>()
    expectTypeOf<"C1">().not.toMatchTypeOf<ComponentCatalogId>()
    expectTypeOf<"C100">().not.toMatchTypeOf<ComponentCatalogId>()
    expectTypeOf<"C-1">().not.toMatchTypeOf<ComponentCatalogId>()
  })

  it("contains exactly the unique audited C001-C099 range", () => {
    expect(componentCatalog).toHaveLength(99)
    expect(new Set(componentCatalog.map((entry) => entry.id)).size).toBe(99)
    expect(componentCatalog.map((entry) => entry.id)).toEqual(
      Array.from({ length: 99 }, (_, index) => `C${String(index + 1).padStart(3, "0")}`),
    )
    expect(componentCatalog.map((entry) => entry.name)).toEqual(auditedNames)
  })

  it("publishes only the 14 names in canonical component metadata as available", () => {
    const available = componentCatalog.filter((entry) => entry.stage === "available")

    expect(available.map((entry) => entry.name)).toEqual(canonicalMetadataNames)
    expect(available.every((entry) => entry.importPath === "@matriz/design-ui")).toBe(true)
    expect(available.every((entry) => entry.packageMetadata)).toBe(true)
    expect(available.every((entry) => entry.name in designUi)).toBe(true)
  })

  it("never publishes an import path or package metadata for a candidate", () => {
    const candidates = componentCatalog.filter((entry) => entry.stage === "candidate")

    expect(candidates).toHaveLength(85)
    expect(candidates.every((entry) => !entry.importPath && !entry.packageMetadata)).toBe(true)
  })

  it("keeps slugs unique and every entry traceable to audit evidence", () => {
    expect(new Set(componentCatalog.map((entry) => entry.slug)).size).toBe(99)
    expect(
      componentCatalog.every(
        (entry) => entry.evidence.length > 0 && entry.domainBoundary.length > 0,
      ),
    ).toBe(true)
  })

  it("preserves the exact 17 components qualified by the audit", () => {
    expect(
      componentCatalog
        .filter((entry) => entry.qualification === "qualified")
        .map((entry) => entry.id),
    ).toEqual([
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
  })
})
