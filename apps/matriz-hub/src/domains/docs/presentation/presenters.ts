import type {
  DocBlockType,
  DocumentDetailDTO,
} from "@matriz/integration-api-contracts/v1/docs"
import type { DocsDocumentVM } from "../domain/types"

export function toDocsDocumentVM(detail: DocumentDetailDTO): DocsDocumentVM {
  const blocksByKind = detail.blocks.reduce(
    (acc, block) => {
      const key = block.type as DocBlockType
      acc[key] = [...(acc[key] ?? []), block]
      return acc
    },
    {} as DocsDocumentVM["blocksByKind"],
  )

  return {
    detail,
    blocksByKind,
    canExportPublic: detail.visibility === "public" && detail.sensitivity === "normal",
  }
}

export function docsToneForStatus(
  status: string,
): "neutral" | "brand" | "success" | "warning" | "danger" {
  if (status === "published" || status === "approved") return "success"
  if (status === "in_review" || status === "structured") return "brand"
  if (status === "deprecated" || status === "superseded" || status === "archived") return "danger"
  if (status === "raw" || status === "draft" || status === "outdated") return "warning"
  return "neutral"
}

export function docsToneForSensitivity(
  sensitivity: string,
): "neutral" | "brand" | "success" | "warning" | "danger" {
  if (sensitivity === "normal") return "neutral"
  if (sensitivity === "financial" || sensitivity === "equity" || sensitivity === "legal") return "danger"
  return "warning"
}

export function docsHumanEventName(name: string): string {
  const labels: Record<string, string> = {
    "docs.document.created": "Documento criado",
    "docs.document.imported": "Documento importado",
    "docs.document.converted": "Conteudo convertido",
    "docs.document.version.created": "Versao criada",
    "docs.document.version.published": "Versao publicada",
    "docs.entity.detected": "Entidade detectada",
    "docs.entity.created": "Entidade criada",
    "docs.relation.suggested": "Relacao sugerida",
    "docs.relation.approved": "Relacao aprovada",
    "docs.suggestion.created": "Sugestao criada",
    "docs.suggestion.accepted": "Sugestao aceita",
    "docs.suggestion.rejected": "Sugestao rejeitada",
    "docs.context.created": "Contexto criado",
    "docs.context.updated": "Contexto atualizado",
    "docs.context.published": "Contexto publicado",
    "docs.mcp.read": "MCP leu contexto",
    "docs.mcp.refreshed": "MCP atualizado",
    "docs.taskCandidate.created": "Task candidate criada",
    "docs.governanceCandidate.created": "Governance candidate criada",
    "docs.export.generated": "Export gerado",
  }
  return labels[name] ?? name
}
