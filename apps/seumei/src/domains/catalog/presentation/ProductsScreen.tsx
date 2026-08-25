"use client"

import * as React from "react"
import { Button, Input } from "@matriz/design-ui"
import {
  Archive,
  Copy,
  Cube,
  MagnifyingGlass,
  Package,
  PencilSimple,
  Plus,
  Star,
  Warning,
} from "@phosphor-icons/react/dist/ssr"
import type { CatalogService } from "../application/catalog.service"
import type { ProductId, SaveProductInput } from "../domain/catalog"
import type { SeumeiTenantContext } from "../../memberships/domain/tenant-context"
import type { CatalogProductRow, CatalogViewModel } from "./catalog.presenter"
import { ProductEditorDialog } from "./ProductEditorDialog"

type CategoryFilter = "all" | string

export function ProductsScreen({
  catalog,
  context,
}: {
  readonly catalog: CatalogService
  readonly context: SeumeiTenantContext
}) {
  const [view, setView] = React.useState<CatalogViewModel | null>(null)
  const [query, setQuery] = React.useState("")
  const [category, setCategory] = React.useState<CategoryFilter>("all")
  const [busyId, setBusyId] = React.useState<ProductId | "editor" | null>(null)
  const [editor, setEditor] = React.useState<CatalogProductRow | "new" | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let active = true
    setView(null)
    void catalog.getProducts(context).then((result) => {
      if (!active) return
      if (result.ok) setView(result.catalog)
      else setError("Não foi possível carregar o catálogo desta empresa.")
    })
    return () => { active = false }
  }, [catalog, context])

  const filteredRows = React.useMemo(() => {
    if (!view) return []
    const normalized = query.trim().toLocaleLowerCase("pt-BR")
    return view.rows.filter((row) => {
      const categoryMatches = category === "all" || row.categoryId === category
      const queryMatches = !normalized || `${row.name} ${row.description}`.toLocaleLowerCase("pt-BR").includes(normalized)
      return categoryMatches && queryMatches
    })
  }, [view, category, query])

  async function execute(
    productId: ProductId | "editor",
    operation: () => ReturnType<CatalogService["getProducts"]>,
  ) {
    setBusyId(productId)
    setError(null)
    const result = await operation()
    setBusyId(null)
    if (!result.ok) {
      setError("A operação não foi concluída. Verifique sua permissão e tente novamente.")
      return false
    }
    setView(result.catalog)
    return true
  }

  if (!view) return <div className="seumei-state">Carregando catálogo seguro…</div>

  const metrics = [
    { label: "Total de produtos", value: view.metrics.total, detail: "Catálogo atual", icon: Package, tone: "purple" },
    { label: "Produtos ativos", value: view.metrics.active, detail: `${Math.round((view.metrics.active / Math.max(view.metrics.total, 1)) * 100)}% do total`, icon: Cube, tone: "purple" },
    { label: "Estoque baixo", value: view.metrics.lowStock, detail: "Requer atenção", icon: Archive, tone: "amber" },
    { label: "Fora de estoque", value: view.metrics.outOfStock, detail: "Indisponíveis", icon: Warning, tone: "red" },
    { label: "Destaques ativos", value: view.metrics.featured, detail: "Em exibição na loja", icon: Star, tone: "purple" },
  ] as const

  return (
    <section className="seumei-products">
      <header className="seumei-products__header">
        <div><h1>Produtos</h1><p>Gerencie seu cardápio, preços, estoque, disponibilidade e modificadores.</p></div>
        <Button className="seumei-products__new" onClick={() => setEditor("new")}><Plus size={17} weight="bold" /> Novo produto</Button>
      </header>

      {error ? <div className="seumei-inline-alert" role="alert">{error}</div> : null}

      <div className="seumei-product-metrics">
        {metrics.map(({ label, value, detail, icon: Icon, tone }) => <article key={label}><span data-tone={tone}><Icon size={21} weight="duotone" /></span><div><small>{label}</small><strong>{value}</strong><em>{detail}</em></div></article>)}
      </div>

      <nav className="seumei-category-tabs" aria-label="Categorias de produtos">
        <button type="button" className={category === "all" ? "is-active" : ""} onClick={() => setCategory("all")}>Todos os produtos</button>
        {view.categories.map((item) => <button type="button" key={item.id} className={category === item.id ? "is-active" : ""} onClick={() => setCategory(item.id)}>{item.label}</button>)}
      </nav>

      <div className="seumei-product-filters">
        <label><MagnifyingGlass size={17} /><Input type="search" aria-label="Buscar produto" placeholder="Buscar produto…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <span>{filteredRows.length} de {view.metrics.total} produtos</span>
      </div>

      <div className="seumei-product-table-wrap">
        <table className="seumei-product-table">
          <thead><tr><th scope="col">Produto</th><th scope="col">Categoria</th><th scope="col">Preço</th><th scope="col">Estoque</th><th scope="col">Status</th><th scope="col">Destaque</th><th scope="col">Modificadores</th><th scope="col">Ações</th></tr></thead>
          <tbody>{filteredRows.map((row) => <tr key={row.id}>
            <td><div className="seumei-product-identity"><img src={row.imageUrl} alt="" /><div><strong>{row.name}</strong><small>{row.description}</small></div></div></td>
            <td><span className="seumei-category-badge">{row.categoryName}</span></td>
            <td><strong>{row.priceLabel}</strong></td>
            <td><div className="seumei-stock"><strong>{row.stockQuantity}</strong><small data-tone={row.stockTone}>{row.stockLabel}</small></div></td>
            <td><button type="button" role="switch" aria-label={`Disponibilidade de ${row.name}`} aria-checked={row.available} disabled={busyId === row.id} className="seumei-switch" onClick={() => void execute(row.id, () => catalog.setProductAvailability(context, row.id, !row.available))}><span /></button></td>
            <td><button type="button" aria-label={`${row.featured ? "Remover" : "Adicionar"} ${row.name} dos destaques`} disabled={busyId === row.id} className={`seumei-feature-toggle${row.featured ? " is-active" : ""}`} onClick={() => void execute(row.id, () => catalog.setProductFeatured(context, row.id, !row.featured))}><Star size={20} weight={row.featured ? "fill" : "regular"} /></button></td>
            <td className="seumei-product-modifier-count">{row.modifierCount}</td>
            <td><div className="seumei-row-actions"><button type="button" aria-label={`Editar ${row.name}`} onClick={() => setEditor(row)}><PencilSimple size={17} /></button><button type="button" aria-label={`Duplicar ${row.name}`} disabled={busyId === row.id} onClick={() => void execute(row.id, () => catalog.duplicateProduct(context, row.id))}><Copy size={17} /></button></div></td>
          </tr>)}</tbody>
        </table>
        {filteredRows.length === 0 ? <div className="seumei-product-empty">Nenhum produto corresponde aos filtros.</div> : null}
      </div>

      <footer className="seumei-products__footer"><span>Exibindo {filteredRows.length} produtos deste tenant</span><span>Dados demo isolados por empresa</span></footer>

      {editor ? <ProductEditorDialog product={editor === "new" ? null : editor} categories={view.categories} modifiers={view.modifiers} busy={busyId === "editor"} onClose={() => setEditor(null)} onSave={async (input: SaveProductInput) => { const saved = await execute("editor", () => catalog.saveProduct(context, input)); if (saved) setEditor(null) }} /> : null}
    </section>
  )
}
