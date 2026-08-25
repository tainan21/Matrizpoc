import type { ReactNode } from "react"
import { StorefrontProvider } from "../../../src/domains/store/presentation/StorefrontProvider"
import { StorefrontChrome } from "../../../src/domains/store/presentation/StorefrontChrome"

export default async function StoreLayout({ children, params }: { readonly children: ReactNode; readonly params: Promise<{ readonly storeSlug: string }> }) {
  const { storeSlug } = await params
  return <StorefrontProvider storeSlug={storeSlug}><StorefrontChrome storeSlug={storeSlug}>{children}</StorefrontChrome></StorefrontProvider>
}

