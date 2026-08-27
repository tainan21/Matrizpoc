export interface ActivityEntry {
  readonly id: string
  readonly occurredAt: string
  readonly category: "git" | "store" | "extension" | "doctor" | "runtime"
  readonly action: string
  readonly subjectId: string
  readonly outcome: "succeeded" | "failed" | "cancelled"
  readonly message: string
}

export interface ActivityLedger { readonly version: 1; readonly entries: readonly ActivityEntry[] }

export function createActivityLedger(entries: readonly ActivityEntry[] = []): ActivityLedger {
  return { version: 1, entries: entries.slice(0, 200).map(sanitizeEntry) }
}

export function appendActivity(ledger: ActivityLedger, entry: ActivityEntry): ActivityLedger {
  return createActivityLedger([sanitizeEntry(entry), ...ledger.entries.filter((item) => item.id !== entry.id)])
}

function sanitizeEntry(entry: ActivityEntry): ActivityEntry {
  const sensitive = /(?:token|secret|password|authorization)\s*[=:]|(?:^|[\\/])\.env(?:\.|$|[\\/])/i
  return { ...entry, message: sensitive.test(entry.message) ? "[conteúdo sensível removido]" : entry.message.slice(0, 240) }
}
