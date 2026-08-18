import { Heading, Text } from "@matriz/design-ui"
import { soundCatalog, soundRegistry } from "@matriz/design-ui/sounds"

import { toSoundCatalogPageViewModel, toSoundPackViewModels } from "../../src/sounds/presenters"
import { SoundExplorer } from "../../src/ui/sounds/sound-explorer"

export default function SoundsPage() {
  const packs = soundRegistry.listPacks()
  const { summary } = toSoundCatalogPageViewModel(soundCatalog, packs)

  return (
    <main className="catalog-page sound-page" id="main-content">
      <header className="catalog-masthead">
        <div className="catalog-masthead__copy">
          <Text className="eyebrow" size="xs">Interaction · Sound Registry · v1</Text>
          <Heading level={1}>Sons</Heading>
          <Text tone="muted">O catálogo semântico de feedback sonoro compartilhado pelos produtos Matriz — substituível por packs, consumido por uma única API.</Text>
        </div>
        <dl aria-label="Resumo do catálogo de sons" className="catalog-summary">
          <div><dt>Total</dt><dd><strong>{summary.total}</strong></dd></div>
          <div><dt>Disponíveis</dt><dd><strong>{summary.available}</strong></dd></div>
          <div><dt>Categorias</dt><dd><strong>{summary.categories}</strong></dd></div>
          <div><dt>Packs</dt><dd><strong>{summary.packs}</strong></dd></div>
        </dl>
      </header>
      <SoundExplorer entries={soundCatalog} packs={toSoundPackViewModels(packs)} />
    </main>
  )
}
