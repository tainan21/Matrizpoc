"use client"

import { Button, EmptyState, Heading, Input, Label, Text } from "@matriz/design-ui"
import Link from "next/link"
import { useMemo, useState } from "react"

import { filterComponentCatalog } from "../../catalog/query"
import { toComponentCatalogPageViewModel } from "../../catalog/presenters"
import type {
  ComponentCatalogCategory,
  ComponentCatalogEntry,
  ComponentCatalogStage,
} from "../../catalog/types"

const stageOptions = [
  { value: "all", label: "Todos os estágios" },
  { value: "available", label: "Disponível" },
  { value: "candidate", label: "Candidato" },
] as const

export interface CatalogExplorerProps {
  readonly entries: readonly ComponentCatalogEntry[]
}

function preferExactMatch(
  entries: readonly ComponentCatalogEntry[],
  query: string,
): readonly ComponentCatalogEntry[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("en-US")
  if (!normalizedQuery) return entries

  const exactMatch = entries.find((entry) =>
    [entry.id, entry.name, entry.slug].some(
      (value) => value.toLocaleLowerCase("en-US") === normalizedQuery,
    ),
  )

  return exactMatch ? [exactMatch] : entries
}

export function CatalogExplorer({ entries }: CatalogExplorerProps) {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<ComponentCatalogCategory | "all">("all")
  const [stage, setStage] = useState<ComponentCatalogStage | "all">("all")
  const categoryOptions = useMemo(() => {
    const items = toComponentCatalogPageViewModel(entries).items
    return Array.from(
      new Map(items.map((item) => [item.category, item.categoryLabel])).entries(),
      ([value, label]) => ({ value, label }),
    )
  }, [entries])
  const viewModel = useMemo(() => {
    const matches = filterComponentCatalog(entries, {
      query,
      category,
      stage,
    })
    return toComponentCatalogPageViewModel(preferExactMatch(matches, query))
  }, [category, entries, query, stage])

  function clearFilters() {
    setQuery("")
    setCategory("all")
    setStage("all")
  }

  return (
    <section aria-label="Explorar catálogo" className="catalog-explorer">
      <div className="catalog-controls">
        <div className="catalog-control catalog-control--search">
          <Label htmlFor="catalog-search">Buscar componentes</Label>
          <Input
            id="catalog-search"
            type="search"
            placeholder="Nome, ID, token ou descrição"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
        </div>

        <div className="catalog-control">
          <Label htmlFor="catalog-category">Categoria</Label>
          <select
            className="catalog-select"
            id="catalog-category"
            value={category}
            onChange={(event) =>
              setCategory(event.currentTarget.value as ComponentCatalogCategory | "all")
            }
          >
            <option value="all">Todas as categorias</option>
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="catalog-control">
          <Label htmlFor="catalog-stage">Estágio</Label>
          <select
            className="catalog-select"
            id="catalog-stage"
            value={stage}
            onChange={(event) =>
              setStage(event.currentTarget.value as ComponentCatalogStage | "all")
            }
          >
            {stageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <Button className="catalog-controls__clear" variant="secondary" onClick={clearFilters}>
          Limpar filtros
        </Button>
      </div>

      <p className="catalog-results-count" role="status" aria-live="polite">
        {viewModel.summary.total} {viewModel.summary.total === 1 ? "componente" : "componentes"}
      </p>

      {viewModel.items.length === 0 ? (
        <EmptyState
          className="catalog-empty"
          title="Nenhum componente encontrado"
          description="Ajuste a busca ou limpe os filtros para consultar todo o inventário."
        />
      ) : (
        <ul className="catalog-list">
          {viewModel.items.map((item) => (
            <li className="catalog-item" key={item.id}>
              <div className="catalog-item__meta">
                <span>{item.id}</span>
                <span>{item.categoryLabel}</span>
                <span className={`catalog-stage catalog-stage--${item.stage}`}>
                  {item.stageLabel}
                </span>
              </div>
              <Heading className="catalog-item__title" level={2}>
                <Link href={item.href}>{item.name}</Link>
              </Heading>
              <Text tone="muted">{item.description}</Text>
              <span className="catalog-item__qualification">{item.qualificationLabel}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
