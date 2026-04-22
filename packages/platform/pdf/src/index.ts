/**
 * @matriz/platform-pdf
 *
 * Mock PDF/document renderer. Produces a plain-text rendering of a
 * structured document; used by Contracts in CP-5 to simulate document
 * generation without a real PDF engine.
 *
 * L12: no domain models — the structure is generic.
 */
export const PLATFORM_PDF_VERSION = "0.1.0" as const

export interface DocumentSection {
  readonly heading: string
  readonly paragraphs: readonly string[]
}

export interface DocumentStructure {
  readonly title: string
  readonly subtitle?: string
  readonly sections: readonly DocumentSection[]
  readonly metadata?: Readonly<Record<string, string>>
}

export function renderMockPdf(doc: DocumentStructure): string {
  const lines: string[] = []
  lines.push(`# ${doc.title}`)
  if (doc.subtitle) lines.push(`_${doc.subtitle}_`)
  if (doc.metadata) {
    lines.push("")
    for (const [k, v] of Object.entries(doc.metadata)) lines.push(`- **${k}**: ${v}`)
  }
  for (const s of doc.sections) {
    lines.push("")
    lines.push(`## ${s.heading}`)
    for (const p of s.paragraphs) lines.push(p)
  }
  return lines.join("\n")
}
