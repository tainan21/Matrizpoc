"use client"

import * as React from "react"
import { createDefaultStore } from "@matriz/platform-storage"
import { SEUMEI_DEMO_FIXTURE_USER_ID } from "../../login/application/demo-account"
import { createDemoSeumeiRuntime } from "../../../lib/container"
import type {
  StorefrontHomeViewModel,
  StorefrontItemInput,
  StorefrontItemQuote,
  StorefrontService,
} from "../application/storefront.service"

interface StoredCartLine {
  readonly id: string
  readonly input: StorefrontItemInput
}

export interface StorefrontCartLine extends StoredCartLine {
  readonly quote: StorefrontItemQuote
}

interface StorefrontState {
  readonly status: "loading" | "ready" | "unavailable"
  readonly home: StorefrontHomeViewModel | null
  readonly service: StorefrontService
  readonly cartLines: readonly StorefrontCartLine[]
  readonly cartCount: number
  readonly cartSubtotalCents: number
  readonly cartTotalCents: number
  readonly cartTotalLabel: string
  readonly cartOpen: boolean
  readonly lastOrder: { readonly id: string; readonly totalLabel: string } | null
  readonly error: string | null
  setCartOpen(open: boolean): void
  addItem(input: StorefrontItemInput): Promise<boolean>
  removeItem(lineId: string): void
  placeOrder(customerName: string): Promise<boolean>
}

const StorefrontContext = React.createContext<StorefrontState | null>(null)

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

function formatCurrency(cents: number) {
  return currency.format(cents / 100).replace(/\s/g, " ")
}

export function StorefrontProvider({
  storeSlug,
  children,
}: {
  readonly storeSlug: string
  readonly children: React.ReactNode
}) {
  const domainStorage = React.useMemo(
    () => createDefaultStore("seumei:demo-domain:v2"),
    [],
  )
  const cartStorage = React.useMemo(
    () => createDefaultStore("seumei:public-cart:v1"),
    [],
  )
  const runtime = React.useMemo(
    () => createDemoSeumeiRuntime(SEUMEI_DEMO_FIXTURE_USER_ID, domainStorage),
    [domainStorage],
  )
  const cartKey = `store:${storeSlug}`
  const [status, setStatus] = React.useState<StorefrontState["status"]>("loading")
  const [home, setHome] = React.useState<StorefrontHomeViewModel | null>(null)
  const [storedLines, setStoredLines] = React.useState<readonly StoredCartLine[]>([])
  const [cartLines, setCartLines] = React.useState<readonly StorefrontCartLine[]>([])
  const [cartOpen, setCartOpen] = React.useState(false)
  const [lastOrder, setLastOrder] = React.useState<StorefrontState["lastOrder"]>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setStoredLines(cartStorage.get<StoredCartLine[]>(cartKey) ?? [])
    void runtime.storefront.getHome(storeSlug).then((result) => {
      if (!result.ok) {
        setStatus("unavailable")
        return
      }
      setHome(result.store)
      setStatus("ready")
    })
  }, [cartKey, cartStorage, runtime, storeSlug])

  React.useEffect(() => {
    let active = true
    void Promise.all(
      storedLines.map(async (line) => {
        const result = await runtime.storefront.quoteItem(storeSlug, line.input)
        return result.ok ? { ...line, quote: result.quote } : null
      }),
    ).then((quoted) => {
      if (!active) return
      const valid = quoted.filter(
        (line): line is StorefrontCartLine => line !== null,
      )
      setCartLines(valid)
      if (valid.length !== storedLines.length) {
        const cleaned = valid.map(({ id, input }) => ({ id, input }))
        setStoredLines(cleaned)
        cartStorage.set(cartKey, cleaned)
      }
    })
    return () => {
      active = false
    }
  }, [cartKey, cartStorage, runtime, storeSlug, storedLines])

  const persistLines = React.useCallback(
    (next: readonly StoredCartLine[]) => {
      setStoredLines(next)
      cartStorage.set(cartKey, next)
    },
    [cartKey, cartStorage],
  )

  const addItem = React.useCallback(
    async (item: StorefrontItemInput) => {
      setError(null)
      const quoted = await runtime.storefront.quoteItem(storeSlug, item)
      if (!quoted.ok) {
        setError("Este item não está mais disponível.")
        return false
      }
      const line: StoredCartLine = {
        id: `cart-${crypto.randomUUID()}`,
        input: item,
      }
      persistLines([...storedLines, line])
      setCartOpen(true)
      return true
    },
    [persistLines, runtime, storeSlug, storedLines],
  )

  const removeItem = React.useCallback(
    (lineId: string) => {
      persistLines(storedLines.filter((line) => line.id !== lineId))
    },
    [persistLines, storedLines],
  )

  const placeOrder = React.useCallback(
    async (customerName: string) => {
      setError(null)
      const result = await runtime.storefront.placeOrder(storeSlug, {
        customerName,
        items: storedLines.map((line) => line.input),
      })
      if (!result.ok) {
        setError("Não foi possível criar o pedido. Revise o carrinho.")
        return false
      }
      setLastOrder({ id: result.order.id, totalLabel: result.order.totalLabel })
      persistLines([])
      return true
    },
    [persistLines, runtime, storeSlug, storedLines],
  )

  const cartSubtotalCents = cartLines.reduce(
    (total, line) => total + line.quote.totalCents,
    0,
  )
  const deliveryFeeCents = cartLines.length
    ? (home?.configuration.deliveryFeeCents ?? 0)
    : 0
  const cartTotalCents = cartSubtotalCents + deliveryFeeCents
  const cartCount = cartLines.reduce(
    (count, line) => count + line.quote.quantity,
    0,
  )

  const value = React.useMemo<StorefrontState>(
    () => ({
      status,
      home,
      service: runtime.storefront,
      cartLines,
      cartCount,
      cartSubtotalCents,
      cartTotalCents,
      cartTotalLabel: formatCurrency(cartTotalCents),
      cartOpen,
      lastOrder,
      error,
      setCartOpen,
      addItem,
      removeItem,
      placeOrder,
    }),
    [
      status,
      home,
      runtime,
      cartLines,
      cartCount,
      cartSubtotalCents,
      cartTotalCents,
      cartOpen,
      lastOrder,
      error,
      addItem,
      removeItem,
      placeOrder,
    ],
  )

  return (
    <StorefrontContext.Provider value={value}>
      {children}
    </StorefrontContext.Provider>
  )
}

export function useStorefront() {
  const value = React.useContext(StorefrontContext)
  if (!value) throw new Error("useStorefront must be used inside StorefrontProvider")
  return value
}

