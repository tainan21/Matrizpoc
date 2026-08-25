"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, Heart, Minus, Plus, Rocket, ShareNetwork, ShoppingBag, Star } from "@phosphor-icons/react"
import { asProductId, type ProductModifierId } from "../../catalog/domain/catalog"
import type { StorefrontItemQuote, StorefrontProductViewModel } from "../application/storefront.service"
import { useStorefront } from "./StorefrontProvider"

export function ProductDetailScreen({ storeSlug, productId }: { readonly storeSlug: string; readonly productId: string }) {
  const storefront = useStorefront()
  const [product, setProduct] = React.useState<StorefrontProductViewModel | null>(null)
  const [selectedModifier, setSelectedModifier] = React.useState<ProductModifierId | null>(null)
  const [quantity, setQuantity] = React.useState(1)
  const [observation, setObservation] = React.useState("")
  const [quote, setQuote] = React.useState<StorefrontItemQuote | null>(null)
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    void storefront.service.getProduct(storeSlug, asProductId(productId)).then((result) => {
      if (!result.ok) return
      setProduct(result.product)
      setSelectedModifier(result.product.modifiers[0]?.id ?? null)
    })
  }, [productId, storeSlug, storefront.service])

  React.useEffect(() => {
    if (!product) return
    void storefront.service.quoteItem(storeSlug, {
      productId: product.id,
      modifierIds: selectedModifier ? [selectedModifier] : [],
      quantity,
      observation,
    }).then((result) => setQuote(result.ok ? result.quote : null))
  }, [observation, product, quantity, selectedModifier, storeSlug, storefront.service])

  if (!product) return <main className="seumei-store-state">Carregando produto…</main>

  async function addToCart() {
    setBusy(true)
    await storefront.addItem({
      productId: product!.id,
      modifierIds: selectedModifier ? [selectedModifier] : [],
      quantity,
      observation,
    })
    setBusy(false)
  }

  return (
    <main className="seumei-product-detail">
      <section className="seumei-product-detail-visual">
        <div className="seumei-product-detail-top"><Link href={`/loja/${storeSlug}`} aria-label="Voltar"><ArrowLeft size={25} /></Link><div><strong>{storefront.home?.appearance.displayName}</strong><span>Loja Oficial</span></div><button type="button" aria-label="Compartilhar"><ShareNetwork size={22} /></button><button type="button" aria-label="Favoritar"><Heart size={22} weight="fill" /></button></div>
        <span className="seumei-product-most-ordered">🔥 MAIS PEDIDO</span>
        <img src={product.imageUrl} alt={product.name} />
      </section>
      <section className="seumei-product-detail-content">
        <header><h1>{product.name} <Star size={30} /></h1><p>{product.description}</p><strong>{product.priceLabel}</strong><span><Rocket size={20} /> {product.deliveryLabel}</span></header>
        {product.modifiers.length ? <section className="seumei-product-modifier-section"><div><h2>Complementos</h2><span>Escolha 1</span></div><div className="seumei-product-modifier-grid">{product.modifiers.map((modifier) => <button type="button" key={modifier.id} className={selectedModifier === modifier.id ? "is-selected" : ""} onClick={() => setSelectedModifier(modifier.id)}><img src={modifier.imageUrl} alt="" /><strong>{modifier.name}</strong><span>+ {modifier.priceLabel}</span><i>{selectedModifier === modifier.id ? "✓" : ""}</i></button>)}</div></section> : null}
        <section className="seumei-product-quantity"><h2>Quantidade</h2><div><button type="button" aria-label="Diminuir quantidade" disabled={quantity === 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))}><Minus size={20} /></button><strong>{quantity}</strong><button type="button" aria-label="Aumentar quantidade" onClick={() => setQuantity((value) => value + 1)}><Plus size={20} /></button></div></section>
        <label className="seumei-product-observation">Observação (opcional)<textarea maxLength={120} value={observation} onChange={(event) => setObservation(event.target.value)} placeholder="Ex.: Sem cebola, molho à parte…" /><small>{observation.length}/120</small></label>
        <section className="seumei-product-total"><div><span>Subtotal<strong>{quote?.baseLabel ?? product.priceLabel}</strong></span><span>Complementos<strong>{quote?.modifiersLabel ?? "R$ 0,00"}</strong></span><span>Total<strong>{quote?.totalLabel ?? product.priceLabel}</strong></span></div><button type="button" disabled={!quote || busy} onClick={() => void addToCart()}><ShoppingBag size={23} /> {busy ? "Adicionando…" : "Adicionar ao carrinho"}</button></section>
      </section>
    </main>
  )
}

