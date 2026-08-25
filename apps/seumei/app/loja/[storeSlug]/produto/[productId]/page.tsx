import { ProductDetailScreen } from "../../../../../src/domains/store/presentation/ProductDetailScreen"

export default async function StoreProductPage({ params }: { readonly params: Promise<{ readonly storeSlug: string; readonly productId: string }> }) {
  const { storeSlug, productId } = await params
  return <ProductDetailScreen storeSlug={storeSlug} productId={productId} />
}

