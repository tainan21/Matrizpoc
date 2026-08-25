"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight, Rocket, ShieldCheck, Star, Truck } from "@phosphor-icons/react"
import { useStorefront } from "./StorefrontProvider"

export function StorefrontScreen({ storeSlug }: { readonly storeSlug: string }) {
  const storefront = useStorefront()
  const [category, setCategory] = React.useState("all")

  if (storefront.status === "loading") return <main className="seumei-store-state">Preparando o cardápio…</main>
  if (storefront.status === "unavailable" || !storefront.home) return <main className="seumei-store-state"><h1>Loja indisponível</h1><p>Esta loja ainda não está publicada.</p></main>

  const home = storefront.home
  const products = category === "all" ? home.products : home.products.filter((product) => product.categoryId === category)

  return (
    <main className="seumei-store-home">
      <section className="seumei-store-hero" style={{ "--store-hero-image": `url(${home.appearance.heroImageUrl})`, backgroundImage: `linear-gradient(90deg, rgba(5,6,16,.96) 0%, rgba(5,6,16,.76) 42%, rgba(5,6,16,.08) 72%), url(${home.appearance.heroImageUrl})` } as React.CSSProperties}>
        <div><span>LOJA OFICIAL</span><h1>{home.appearance.headline}</h1><p>{home.appearance.description}</p><div className="seumei-store-hero-actions"><a href="#cardapio">Ver cardápio <ArrowRight size={18} /></a><Link href={`/loja/${storeSlug}/produto/product-x-galaxia`}>Pedir agora</Link></div></div>
      </section>

      <section className="seumei-store-benefits"><article><Truck size={27} /><div><strong>Entrega rápida</strong><span>em até 45 min</span></div></article><article><ShieldCheck size={27} /><div><strong>Pagamento seguro</strong><span>100% protegido</span></div></article><article><Star size={27} /><div><strong>Avaliação 4,9</strong><span>+2k pedidos</span></div></article></section>

      <section id="cardapio" className="seumei-store-catalog">
        <header><div><Rocket size={25} /><h2>Destaques do cardápio</h2></div><button type="button" onClick={() => setCategory("all")}>Ver todos <ArrowRight size={17} /></button></header>
        <nav aria-label="Categorias"><button type="button" className={category === "all" ? "is-active" : ""} onClick={() => setCategory("all")}>Todos</button>{home.categories.map((item) => <button type="button" key={item.id} className={category === item.id ? "is-active" : ""} onClick={() => setCategory(item.id)}>{item.label}</button>)}</nav>
        <div className="seumei-store-product-grid">
          {products.map((product) => (
            <Link href={`/loja/${storeSlug}/produto/${product.id}`} key={product.id} className="seumei-store-product-card">
              <div><img src={product.imageUrl} alt={product.name} />{product.featured ? <span>Mais pedido</span> : null}</div>
              <section><small>{product.categoryLabel}</small><h3>{product.name}</h3><p>{product.description}</p><footer><strong>{product.priceLabel}</strong><i>+</i></footer></section>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
