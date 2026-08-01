import { createHash } from "node:crypto"
import type { DocBlockType, DocSensitivity } from "@matriz/integration-api-contracts/v1/docs"

export interface ParsedDocBlock {
  type: DocBlockType
  plainText: string
  content: Record<string, unknown>
  sensitivity: DocSensitivity
}

const SENSITIVE_PATTERN = /\b(equity|cota|cotas|saldo|pagamento|stripe|dinheiro|contrato|juridic|jurídic|sócio|socio)\b/i

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "documento"
}

export function hashContent(input: string): string {
  return createHash("sha256").update(input).digest("hex")
}

export function parseTextToBlocks(content: string): ParsedDocBlock[] {
  const normalized = content.replace(/\r\n/g, "\n").trim()
  if (!normalized) {
    return [
      {
        type: "paragraph",
        plainText: "",
        content: { text: "" },
        sensitivity: "normal",
      },
    ]
  }

  const blocks: ParsedDocBlock[] = []
  const lines = normalized.split("\n")
  let paragraph: string[] = []

  const flushParagraph = () => {
    if (paragraph.length === 0) return
    const text = paragraph.join(" ").trim()
    if (text) blocks.push(makeBlock(text))
    paragraph = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) {
      flushParagraph()
      continue
    }
    if (line.startsWith("#")) {
      flushParagraph()
      const level = Math.min(line.match(/^#+/)?.[0].length ?? 1, 6)
      const text = line.replace(/^#+\s*/, "")
      blocks.push({
        type: "heading",
        plainText: text,
        content: { level, text },
        sensitivity: detectSensitivity(text),
      })
      continue
    }
    if (/^[-*]\s+/.test(line)) {
      flushParagraph()
      const text = line.replace(/^[-*]\s+/, "")
      blocks.push({
        type: "list",
        plainText: text,
        content: { items: [text] },
        sensitivity: detectSensitivity(text),
      })
      continue
    }
    paragraph.push(line)
  }
  flushParagraph()
  return blocks.length > 0 ? blocks : [{ type: "paragraph", plainText: normalized, content: { text: normalized }, sensitivity: detectSensitivity(normalized) }]
}

export function makeBlock(text: string): ParsedDocBlock {
  const lower = text.toLowerCase()
  let type: DocBlockType = "paragraph"
  if (lower.includes("foi decidido") || lower.includes("decidimos")) type = "decision"
  else if (lower.includes("regra") || lower.includes("deve ")) type = "rule"
  else if (lower.includes("precisamos") || lower.includes("implementar")) type = "task_candidate"
  else if (lower.includes("risco") || lower.includes("atenção") || lower.includes("atencao")) type = "risk"
  else if (lower.includes("governança") || lower.includes("governanca") || lower.includes("equity")) type = "governance_candidate"
  else if (/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][^.!?]{2,80}\s+é\s+/.test(text)) type = "definition"
  return {
    type,
    plainText: text,
    content: { text },
    sensitivity: detectSensitivity(text),
  }
}

export function detectSensitivity(text: string): DocSensitivity {
  if (/\b(equity|cota|cotas|participação|participacao)\b/i.test(text)) return "equity"
  if (/\b(saldo|pagamento|stripe|dinheiro|financeiro|mc)\b/i.test(text)) return "financial"
  if (/\b(contrato|juridic|jurídic)\b/i.test(text)) return "legal"
  if (SENSITIVE_PATTERN.test(text)) return "sensitive"
  return "normal"
}

export function extractEntityNames(text: string): string[] {
  const explicit = Array.from(text.matchAll(/#([\p{L}\p{N}_-]+)/gu)).map((m) => m[1] ?? "")
  const canonical = [
    "Matriz",
    "MatrizHub",
    "MatrizDocs",
    "MatrizWallet",
    "MatrizMCP",
    "Governança",
    "Governanca",
    "Sprint",
    "Convites",
    "Seumei",
    "Spot",
  ].filter((name) => new RegExp(`\\b${name}\\b`, "i").test(text))
  return Array.from(new Set([...explicit, ...canonical].map((n) => n.trim()).filter(Boolean)))
}

export function summarizeBlocks(blocks: readonly ParsedDocBlock[]): string {
  const first = blocks.find((b) => b.plainText.trim().length > 0)?.plainText ?? ""
  if (!first) return "Documento sem resumo gerado ainda."
  return first.length > 220 ? `${first.slice(0, 217)}...` : first
}
