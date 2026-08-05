import type { SiteSummary } from "../../integration/sites/site-catalog-bridge"

const STATUS_LABELS: Record<SiteSummary["status"], string> = {
  draft: "Rascunho",
  active: "Ativo",
  archived: "Arquivado",
}

const METADATA_LABELS: Record<string, string> = {
  title: "título",
  description: "descrição",
  canonicalPath: "URL canônica",
  openGraphImage: "imagem social",
  icons: "ícones",
}

export interface SiteCatalogItemViewModel extends SiteSummary {
  shortLabel: string
  statusLabel: string
  completion: number
  completionLabel: string
  localeLabel: string
  missingLabel: string
}

function sentenceList(values: string[]): string {
  if (!values.length) return "Metadata essencial completa"
  if (values.length === 1) return `Falta ${values[0]}`
  return `Faltam ${values.slice(0, -1).join(", ")} e ${values.at(-1)}`
}

export function toSiteCatalogItemViewModel(site: SiteSummary): SiteCatalogItemViewModel {
  const { completed, total, missing } = site.metadataCompleteness
  const initials = site.name.match(/[\p{L}\p{N}]/gu)?.slice(0, 2).join("") ?? site.id.slice(0, 2)
  return {
    ...site,
    shortLabel: initials.toLocaleUpperCase("pt-BR"),
    statusLabel: STATUS_LABELS[site.status],
    completion: total ? Math.round((completed / total) * 100) : 0,
    completionLabel: `${completed} de ${total} itens`,
    localeLabel: site.locales.length === 1 ? "1 idioma" : `${site.locales.length} idiomas`,
    missingLabel: sentenceList(missing.map((field) => METADATA_LABELS[field] ?? field)),
  }
}
