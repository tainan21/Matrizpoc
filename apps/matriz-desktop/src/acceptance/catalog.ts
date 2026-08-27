export type AcceptanceTarget =
  | "installed-baseline"
  | "source-runtime"
  | "packaged-candidate"

export type AcceptanceFamily =
  | "accessibility"
  | "actions"
  | "apps"
  | "command"
  | "doctor"
  | "installer"
  | "lifecycle"
  | "native"
  | "navigation"
  | "ports"
  | "settings"
  | "terminal"
  | "visual"
  | "workspace"

export type AcceptanceRisk = "critical" | "important" | "minor"
export type AcceptanceAppAction = "start" | "ready" | "stop" | "restart"

export const ACCEPTANCE_APP_IDS = Object.freeze([
  "matriz-hub",
  "spot",
  "matriz-admin",
  "contracts",
  "willdash",
  "matriz-workbench",
  "sites",
  "matrizlib",
  "seumei",
] as const)

export type AcceptanceAppId = (typeof ACCEPTANCE_APP_IDS)[number]

export interface AcceptanceCase {
  readonly id: string
  readonly family: AcceptanceFamily
  readonly title: string
  readonly required: true
  readonly risk: AcceptanceRisk
  readonly targets: readonly AcceptanceTarget[]
  readonly appId?: AcceptanceAppId
  readonly action?: AcceptanceAppAction
}

const FAMILY_BY_PREFIX = Object.freeze({
  LIFE: "lifecycle",
  PORT: "ports",
  TERM: "terminal",
  ACT: "actions",
  DOC: "doctor",
  GIT: "workspace",
  JUMP: "workspace",
  CMD: "command",
  NAV: "navigation",
  NATIVE: "native",
  SET: "settings",
  A11Y: "accessibility",
  VIS: "visual",
  INST: "installer",
} satisfies Record<string, Exclude<AcceptanceFamily, "apps">>)

const CRITICAL_IDS = new Set([
  "PORT-004",
  "PORT-005",
  "PORT-006",
  "PORT-007",
  "TERM-010",
  "TERM-011",
  "NATIVE-003",
  "NATIVE-006",
  "INST-005",
  "INST-006",
])

function range(prefix: string, count: number): readonly string[] {
  return Array.from({ length: count }, (_, index) => `${prefix}-${String(index + 1).padStart(3, "0")}`)
}

const BASE_IDS = Object.freeze([
  ...range("LIFE", 8),
  ...range("PORT", 8),
  ...range("TERM", 11),
  ...range("ACT", 3),
  ...range("DOC", 2),
  "GIT-001",
  "JUMP-001",
  ...range("CMD", 4),
  ...range("NAV", 3),
  ...range("NATIVE", 6),
  ...range("SET", 3),
  ...range("A11Y", 3),
  ...range("VIS", 3),
  ...range("INST", 6),
])

const APP_ACTIONS = Object.freeze(["start", "ready", "stop", "restart"] as const)
const ALL_TARGETS = Object.freeze<AcceptanceTarget[]>([
  "installed-baseline",
  "source-runtime",
  "packaged-candidate",
])
const CURRENT_TARGETS = Object.freeze<AcceptanceTarget[]>([
  "source-runtime",
  "packaged-candidate",
])
const PACKAGED_TARGET = Object.freeze<AcceptanceTarget[]>(["packaged-candidate"])

function familyFor(id: string): Exclude<AcceptanceFamily, "apps"> {
  const prefix = id.slice(0, id.indexOf("-"))
  const family = FAMILY_BY_PREFIX[prefix as keyof typeof FAMILY_BY_PREFIX]
  if (!family) throw new Error(`Unknown acceptance prefix: ${prefix}`)
  return family
}

function targetsFor(family: AcceptanceFamily): readonly AcceptanceTarget[] {
  if (family === "installer") return PACKAGED_TARGET
  if (family === "lifecycle" || family === "navigation" || family === "visual") return ALL_TARGETS
  return CURRENT_TARGETS
}

function baseCase(id: string): AcceptanceCase {
  const family = familyFor(id)
  return Object.freeze({
    id,
    family,
    title: id,
    required: true,
    risk: CRITICAL_IDS.has(id) ? "critical" : "important",
    targets: targetsFor(family),
  })
}

function appCase(appId: AcceptanceAppId, action: AcceptanceAppAction): AcceptanceCase {
  return Object.freeze({
    id: `APP-${appId.toUpperCase()}-${action.toUpperCase()}`,
    family: "apps",
    title: `${appId} ${action}`,
    required: true,
    risk: "important",
    targets: CURRENT_TARGETS,
    appId,
    action,
  })
}

export const ACCEPTANCE_CASES: readonly AcceptanceCase[] = Object.freeze([
  ...BASE_IDS.map(baseCase),
  ...ACCEPTANCE_APP_IDS.flatMap((appId) => APP_ACTIONS.map((action) => appCase(appId, action))),
])

export type AcceptanceId = (typeof ACCEPTANCE_CASES)[number]["id"]
