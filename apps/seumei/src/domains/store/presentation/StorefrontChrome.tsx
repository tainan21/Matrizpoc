"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Bell,
  House,
  List,
  MagnifyingGlass,
  Minus,
  Package,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  User,
  X,
} from "@phosphor-icons/react"
import { useStorefront } from "./StorefrontProvider"

export function StorefrontChrome({
  storeSlug,
  children,
}: {
  readonly storeSlug: string
  readonly children: React.ReactNode
}) {
  const storefront = useStorefront()
  const pathname = usePathname()
  const isProductDetail = pathname.includes("/produto/")

  return (
    <div className="seumei-storefront">
      {!isProductDetail ? <header className="seumei-store-header">
        <button type="button" className="seumei-store-mobile-menu" aria-label="Abrir menu"><List size={25} /></button>
        <Link href={`/loja/${storeSlug}`} className="seumei-store-brand">
          {storefront.home ? <img src={storefront.home.appearance.logoUrl} alt="" /> : null}
          <strong>{storefront.home?.appearance.displayName ?? "Seumei Store"}</strong>
        </Link>
        <div className="seumei-store-open"><i /><span>{storefront.home?.configuration.openingLabel ?? "Carregando…"}</span></div>
        <label className="seumei-store-search"><MagnifyingGlass size={21} /><input aria-label="Buscar no cardápio" placeholder="Buscar" /></label>
        <button type="button" className="seumei-store-bell" aria-label="Notificações"><Bell size={23} /><i /></button>
        <button type="button" className="seumei-store-cart-trigger" aria-label={`Abrir carrinho com ${storefront.cartCount} itens`} onClick={() => storefront.setCartOpen(true)}>
          <ShoppingCart size={26} />
          {storefront.cartCount ? <b>{storefront.cartCount}</b> : null}
          <small>{storefront.cartTotalLabel}</small>
        </button>
      </header> : null}
      {children}
      <nav className="seumei-store-bottom-nav" aria-label="Navegação da loja">
        <Link href={`/loja/${storeSlug}`} className="is-active"><House size={25} weight="fill" /><span>Início</span></Link>
        <Link href={`/loja/${storeSlug}#cardapio`}><Package size={25} /><span>Cardápio</span></Link>
        <button type="button"><Receipt size={25} /><span>Pedidos</span></button>
        <button type="button"><User size={25} /><span>Conta</span></button>
        <button type="button" className="seumei-store-bottom-cart" onClick={() => storefront.setCartOpen(true)}><ShoppingBag size={27} />{storefront.cartCount ? <b>{storefront.cartCount}</b> : null}<span>Carrinho</span></button>
      </nav>
      <CartDrawer />
    </div>
  )
}

function CartDrawer() {
  const storefront = useStorefront()
  const [customerName, setCustomerName] = React.useState("Lucas Ferreira")
  const [busy, setBusy] = React.useState(false)
  if (!storefront.cartOpen) return null

  async function finishOrder() {
    setBusy(true)
    await storefront.placeOrder(customerName)
    setBusy(false)
  }

  return (
    <div className="seumei-cart-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) storefront.setCartOpen(false)
    }}>
      <aside className="seumei-cart-drawer" aria-label="Seu carrinho">
        <header><div><span>Seu pedido</span><strong>{storefront.cartCount} {storefront.cartCount === 1 ? "item" : "itens"}</strong></div><button type="button" aria-label="Fechar carrinho" onClick={() => storefront.setCartOpen(false)}><X size={20} /></button></header>
        {storefront.lastOrder && storefront.cartLines.length === 0 ? (
          <div className="seumei-cart-success"><span>✓</span><h2>Pedido criado!</h2><p>{storefront.lastOrder.id}</p><strong>{storefront.lastOrder.totalLabel}</strong><button type="button" onClick={() => storefront.setCartOpen(false)}>Continuar no cardápio</button></div>
        ) : storefront.cartLines.length ? (
          <>
            <div className="seumei-cart-lines">
              {storefront.cartLines.map((line) => (
                <article key={line.id}>
                  <img src={line.quote.imageUrl} alt="" />
                  <div><strong>{line.quote.productName}</strong><span>{line.quote.modifierNames.join(", ") || "Sem adicionais"}</span><small>{line.quote.quantity} × {line.quote.unitLabel}</small></div>
                  <button type="button" aria-label={`Remover ${line.quote.productName}`} onClick={() => storefront.removeItem(line.id)}><Minus size={16} /></button>
                </article>
              ))}
            </div>
            <div className="seumei-cart-summary"><div><span>Subtotal</span><strong>{formatCurrency(storefront.cartSubtotalCents)}</strong></div><div><span>Entrega</span><strong>{formatCurrency(storefront.home?.configuration.deliveryFeeCents ?? 0)}</strong></div><div className="is-total"><span>Total</span><strong>{storefront.cartTotalLabel}</strong></div></div>
            <label className="seumei-cart-customer">Nome para o pedido<input value={customerName} onChange={(event) => setCustomerName(event.target.value)} /></label>
            {storefront.error ? <p className="seumei-cart-error" role="alert">{storefront.error}</p> : null}
            <button type="button" className="seumei-cart-checkout" disabled={busy || !customerName.trim()} onClick={() => void finishOrder()}>{busy ? "Criando pedido…" : "Finalizar pedido"}</button>
          </>
        ) : (
          <div className="seumei-cart-empty"><ShoppingBag size={42} /><h2>Seu carrinho está vazio</h2><p>Escolha um item da galáxia para começar.</p></div>
        )}
      </aside>
    </div>
  )
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
    .format(cents / 100)
    .replace(/\s/g, " ")
}
