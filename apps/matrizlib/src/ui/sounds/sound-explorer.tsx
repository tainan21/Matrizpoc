"use client"

import { Button, EmptyState, Heading, Input, Label, Text } from "@matriz/design-ui"
import {
  sound,
  type SoundCategory,
  type SoundDefinition,
  type SoundStatus,
  type SoundSystem,
  type SoundSystemState,
} from "@matriz/design-ui/sounds"
import { useEffect, useMemo, useState } from "react"

import { toSoundCatalogPageViewModel } from "../../sounds/presenters"
import { filterSoundCatalog } from "../../sounds/query"
import type { SoundPackViewModel } from "../../sounds/types"

export interface SoundExplorerProps {
  readonly entries: readonly SoundDefinition[]
  readonly packs: readonly SoundPackViewModel[]
  readonly soundSystem?: SoundSystem
}

const categoryLabels: Readonly<Record<SoundCategory, string>> = {
  system: "Sistema",
  communication: "Comunicação",
  commerce: "Comércio",
  status: "Estado",
  interaction: "Interação",
}

export function SoundExplorer({ entries, packs, soundSystem = sound }: SoundExplorerProps) {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<SoundCategory | "all">("all")
  const [status, setStatus] = useState<SoundStatus | "all">("all")
  const [packId, setPackId] = useState<string | "all">("all")
  const [systemState, setSystemState] = useState<SoundSystemState>(() => soundSystem.getState())
  const [announcement, setAnnouncement] = useState("Catálogo sonoro pronto.")

  useEffect(() => {
    const unsubscribe = soundSystem.subscribe(setSystemState)
    void soundSystem.initialize()
    return unsubscribe
  }, [soundSystem])

  const packMembership = useMemo(
    () => Object.fromEntries(packs.map((pack) => [pack.id, pack.soundIds])),
    [packs],
  )
  const filtered = useMemo(
    () => filterSoundCatalog(entries, { query, category, status, packId }, packMembership),
    [category, entries, packId, packMembership, query, status],
  )
  const items = useMemo(
    () => toSoundCatalogPageViewModel(filtered, []).items,
    [filtered],
  )

  function clearFilters() {
    setQuery("")
    setCategory("all")
    setStatus("all")
    setPackId("all")
  }

  async function togglePreview(item: (typeof items)[number]) {
    if (systemState.playingId === item.id) {
      soundSystem.stop()
      setAnnouncement(`${item.name} interrompido.`)
      return
    }
    const result = await soundSystem.play(item.id)
    setAnnouncement(
      result.status === "played"
        ? `${item.name} em reprodução.`
        : `${item.name} não foi reproduzido: ${result.status}.`,
    )
  }

  return (
    <section aria-label="Explorar sons" className="catalog-explorer sound-explorer">
      <div className="sound-global-controls" aria-label="Controles globais de áudio">
        <div>
          <span className="sound-global-controls__label">Sistema</span>
          <strong>{systemState.enabled ? "Ativo" : "Desativado"}</strong>
        </div>
        <Button
          variant="secondary"
          onClick={() => (systemState.enabled ? soundSystem.disable() : soundSystem.enable())}
        >
          {systemState.enabled ? "Desativar áudio" : "Ativar áudio"}
        </Button>
        <Button
          variant="secondary"
          disabled={!systemState.enabled}
          onClick={() => (systemState.muted ? soundSystem.unmute() : soundSystem.mute())}
        >
          {systemState.muted ? "Restaurar sons" : "Silenciar sons"}
        </Button>
        <div className="catalog-control sound-pack-control">
          <Label htmlFor="active-sound-pack">Pack ativo</Label>
          <select
            id="active-sound-pack"
            className="catalog-select"
            value={systemState.packId}
            onChange={(event) => soundSystem.setPack(event.currentTarget.value)}
          >
            {packs.map((pack) => <option key={pack.id} value={pack.id}>{pack.name}</option>)}
          </select>
        </div>
        <div className="sound-volume-control">
          <Label htmlFor="sound-volume">Volume global</Label>
          <input
            id="sound-volume"
            type="range"
            min="0"
            max="100"
            value={Math.round(systemState.volume * 100)}
            disabled={!systemState.enabled}
            onChange={(event) => soundSystem.setVolume(Number(event.currentTarget.value) / 100)}
          />
          <output htmlFor="sound-volume">{Math.round(systemState.volume * 100)}%</output>
        </div>
      </div>

      <div className="catalog-controls sound-catalog-controls">
        <div className="catalog-control catalog-control--search">
          <Label htmlFor="sound-search">Buscar sons</Label>
          <Input id="sound-search" type="search" placeholder="Nome, ID ou descrição" value={query} onChange={(event) => setQuery(event.currentTarget.value)} />
        </div>
        <div className="catalog-control">
          <Label htmlFor="sound-category">Categoria</Label>
          <select id="sound-category" className="catalog-select" value={category} onChange={(event) => setCategory(event.currentTarget.value as SoundCategory | "all")}>
            <option value="all">Todas as categorias</option>
            {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div className="catalog-control">
          <Label htmlFor="sound-status">Status</Label>
          <select id="sound-status" className="catalog-select" value={status} onChange={(event) => setStatus(event.currentTarget.value as SoundStatus | "all")}>
            <option value="all">Todos os status</option>
            <option value="available">Disponível</option>
            <option value="disabled">Desativado</option>
          </select>
        </div>
        <div className="catalog-control">
          <Label htmlFor="sound-pack">Pack</Label>
          <select id="sound-pack" className="catalog-select" value={packId} onChange={(event) => setPackId(event.currentTarget.value)}>
            <option value="all">Todos os packs</option>
            {packs.map((pack) => <option key={pack.id} value={pack.id}>{pack.name}</option>)}
          </select>
        </div>
        <Button className="catalog-controls__clear" variant="secondary" onClick={clearFilters}>Limpar filtros</Button>
      </div>

      <p className="catalog-results-count" role="status" aria-live="polite">
        {items.length} {items.length === 1 ? "som" : "sons"}
      </p>
      <p className="sr-only" aria-live="polite">{announcement}</p>

      {items.length === 0 ? (
        <EmptyState className="catalog-empty" title="Nenhum som encontrado" description="Ajuste os filtros para consultar o catálogo semântico." />
      ) : (
        <ul className="catalog-list sound-list">
          {items.map((item) => {
            const isPlaying = systemState.playingId === item.id
            return (
              <li className={`catalog-item sound-item${isPlaying ? " sound-item--playing" : ""}`} key={item.id}>
                <div className="catalog-item__meta">
                  <span>{item.id}</span><span>{item.categoryLabel}</span>
                  <span className={`catalog-stage catalog-stage--${item.status}`}>{item.statusLabel}</span>
                </div>
                <div className="sound-item__body">
                  <div>
                    <Heading className="catalog-item__title" level={2}>{item.name}</Heading>
                    <Text tone="muted">{item.description}</Text>
                  </div>
                  <Button variant={isPlaying ? "primary" : "secondary"} disabled={!systemState.enabled || systemState.muted} onClick={() => void togglePreview(item)}>
                    {isPlaying ? `Parar ${item.name}` : `Ouvir ${item.name}`}
                  </Button>
                </div>
                <dl className="sound-item__specs">
                  <div><dt>Asset</dt><dd>{item.assetFile}</dd></div>
                  <div><dt>Volume</dt><dd>{item.defaultVolumeLabel}</dd></div>
                  <div><dt>Acessibilidade</dt><dd>{item.accessibility}</dd></div>
                </dl>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
