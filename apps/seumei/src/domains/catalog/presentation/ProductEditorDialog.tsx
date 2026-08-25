"use client"

import * as React from "react"
import { Button, FormField, Input } from "@matriz/design-ui"
import { X } from "@phosphor-icons/react/dist/ssr"
import type { SaveProductInput } from "../domain/catalog"
import type {
  CatalogCategoryOption,
  CatalogModifierOption,
  CatalogProductRow,
} from "./catalog.presenter"

export function ProductEditorDialog({
  product,
  categories,
  modifiers,
  busy,
  onClose,
  onSave,
}: {
  readonly product: CatalogProductRow | null
  readonly categories: readonly CatalogCategoryOption[]
  readonly modifiers: readonly CatalogModifierOption[]
  readonly busy: boolean
  readonly onClose: () => void
  readonly onSave: (input: SaveProductInput) => Promise<void>
}) {
  const titleId = React.useId()
  const firstInputRef = React.useRef<HTMLInputElement>(null)
  const [name, setName] = React.useState(product?.name ?? "")
  const [description, setDescription] = React.useState(product?.description ?? "")
  const [categoryId, setCategoryId] = React.useState(
    product?.categoryId ?? categories[0]?.id ?? "",
  )
  const [price, setPrice] = React.useState(
    product ? (product.priceCents / 100).toFixed(2).replace(".", ",") : "",
  )
  const [stock, setStock] = React.useState(String(product?.stockQuantity ?? 0))
  const [available, setAvailable] = React.useState(product?.available ?? true)
  const [featured, setFeatured] = React.useState(product?.featured ?? false)
  const [modifierIds, setModifierIds] = React.useState(
    () => new Set(product?.modifierIds ?? []),
  )
  const [validationError, setValidationError] = React.useState<string | null>(null)

  React.useEffect(() => {
    firstInputRef.current?.focus()
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [busy, onClose])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const priceCents = Math.round(Number(price.replace(",", ".")) * 100)
    const stockQuantity = Number(stock)
    if (!name.trim() || !Number.isFinite(priceCents) || priceCents < 0) {
      setValidationError("Informe nome e preço válidos.")
      return
    }
    setValidationError(null)
    await onSave({
      id: product?.id,
      categoryId: categoryId as SaveProductInput["categoryId"],
      name,
      description,
      priceCents,
      stockQuantity,
      available,
      featured,
      modifierIds: [...modifierIds],
    })
  }

  return (
    <div className="seumei-product-dialog-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onClose()
    }}>
      <section className="seumei-product-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header>
          <div>
            <span>Catálogo</span>
            <h2 id={titleId}>{product ? "Editar produto" : "Novo produto"}</h2>
          </div>
          <button type="button" aria-label="Fechar editor" onClick={onClose} disabled={busy}><X size={18} /></button>
        </header>
        <form onSubmit={submit}>
          <FormField id="product-name" label="Nome do produto">
            <Input ref={firstInputRef} value={name} onChange={(event) => setName(event.target.value)} required />
          </FormField>
          <FormField id="product-description" label="Descrição">
            <textarea id="product-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />
          </FormField>
          <div className="seumei-product-form-grid">
            <FormField id="product-category" label="Categoria">
              <select id="product-category" value={categoryId} onChange={(event) => setCategoryId(event.target.value as typeof categoryId)}>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
              </select>
            </FormField>
            <FormField id="product-price" label="Preço (R$)">
              <Input inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} required />
            </FormField>
            <FormField id="product-stock" label="Estoque">
              <Input type="number" min={0} step={1} value={stock} onChange={(event) => setStock(event.target.value)} required />
            </FormField>
          </div>
          <fieldset className="seumei-product-flags">
            <legend>Publicação</legend>
            <label><input type="checkbox" checked={available} onChange={(event) => setAvailable(event.target.checked)} /> Disponível</label>
            <label><input type="checkbox" checked={featured} onChange={(event) => setFeatured(event.target.checked)} /> Em destaque</label>
          </fieldset>
          {modifiers.length ? <fieldset className="seumei-product-modifiers"><legend>Modificadores</legend>{modifiers.map((modifier) => <label key={modifier.id}><input type="checkbox" checked={modifierIds.has(modifier.id)} onChange={(event) => setModifierIds((current) => { const next = new Set(current); if (event.target.checked) next.add(modifier.id); else next.delete(modifier.id); return next })} /> <span>{modifier.label}<small>{modifier.priceLabel}</small></span></label>)}</fieldset> : null}
          {validationError ? <p role="alert" className="seumei-product-error">{validationError}</p> : null}
          <footer><Button variant="secondary" onClick={onClose} disabled={busy}>Cancelar</Button><Button type="submit" disabled={busy}>{busy ? "Salvando…" : "Salvar produto"}</Button></footer>
        </form>
      </section>
    </div>
  )
}
