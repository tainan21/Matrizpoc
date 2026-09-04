const EXACT_JOURNEYS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  "exits through the product command instead of external process termination": ["LIFE-005"],
  "exits without orphaning terminal children or persisting terminal output": ["TERM-010", "TERM-011"],
  "keeps the global bottom dock idle, resizable and persisted": ["TERM-006", "TERM-009", "NAV-002"],
  "streams cwd and Unicode output, then remains interactive after Ctrl+C": ["TERM-001", "TERM-002", "TERM-003", "TERM-007"],
  "enforces six tabs and releases every session through visible controls": ["TERM-004", "TERM-005", "TERM-008"],
  "renders the Matriz identity and exposes every primary mode": ["NAV-001"],
  "navigates through the compact shell in one native window": ["NAV-001", "VIS-001"],
  "opens the command deck with Ctrl K and restores focus": ["CMD-001"],
  "persists compact settings across navigation": ["SET-001"],
  "reports the real workspace, toolchain, and Git pulse": ["DOC-001"],
  "observes the real Git workspace without mutating it": ["GIT-001"],
  "keeps every primary surface usable across supported window sizes": ["A11Y-001", "NAV-001", "VIS-001", "VIS-003"],
  "keeps motion restrained and the terminal operable": ["A11Y-002", "VIS-002"],
  "observes and terminates only harness-owned listener snapshots": ["PORT-001", "PORT-003", "PORT-004", "PORT-005", "PORT-006", "PORT-007"],
  "builds, installs, starts, and stops the canonical native app": ["NATIVE-001", "NATIVE-004", "NATIVE-005"],
  "rejects missing and tampered native installers before execution": ["NATIVE-003", "NATIVE-006"],
})

const APP_LABELS: Readonly<Record<string, string>> = Object.freeze({
  Hub: "MATRIZ-HUB", Spot: "SPOT", "Matriz Admin": "MATRIZ-ADMIN", Contracts: "CONTRACTS",
  Willdash: "WILLDASH", Workbench: "MATRIZ-WORKBENCH", Sites: "SITES", MatrizLib: "MATRIZLIB", Seumei: "SEUMEI",
})

export function acceptanceIdsForJourney(title: string): readonly string[] {
  const exact = EXACT_JOURNEYS[title]
  if (exact) return exact
  const prefix = "starts, owns, stops, and restarts "
  if (!title.startsWith(prefix)) return []
  const app = APP_LABELS[title.slice(prefix.length)]
  return app ? ["START", "READY", "STOP", "RESTART"].map((action) => `APP-${app}-${action}`) : []
}
