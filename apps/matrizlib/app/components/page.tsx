import { Heading, Text } from "@matriz/design-ui"

import { componentCatalog } from "../../src/catalog/component-catalog"
import { toComponentCatalogPageViewModel } from "../../src/catalog/presenters"
import { CatalogExplorer } from "../../src/ui/catalog/catalog-explorer"

export default function ComponentsPage() {
  const { summary } = toComponentCatalogPageViewModel(componentCatalog)

  return (
    <main className="catalog-page" id="main-content">
      <header className="catalog-masthead">
        <div className="catalog-masthead__copy">
          <Text className="eyebrow" size="xs">
            Inventário auditado · C001—C099
          </Text>
          <Heading level={1}>Componentes</Heading>
          <Text tone="muted">
            Consulte contratos publicados e candidatos documentados sem confundir intenção com API.
          </Text>
        </div>

        <dl aria-label="Resumo do catálogo" className="catalog-summary">
          <div>
            <dt>Total</dt>
            <dd>
              <strong>{summary.total}</strong>
            </dd>
          </div>
          <div>
            <dt>Disponíveis</dt>
            <dd>
              <strong>{summary.available}</strong>
            </dd>
          </div>
          <div>
            <dt>Candidatos</dt>
            <dd>
              <strong>{summary.candidates}</strong>
            </dd>
          </div>
          <div>
            <dt>Qualificados</dt>
            <dd>
              <strong>{summary.qualified}</strong>
            </dd>
          </div>
        </dl>
      </header>

      <CatalogExplorer entries={componentCatalog} />
    </main>
  )
}
