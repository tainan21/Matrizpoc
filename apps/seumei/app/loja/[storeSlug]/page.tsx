import { StorefrontScreen } from "../../../src/domains/store/presentation/StorefrontScreen"

export default async function PublicStorePage({ params }: { readonly params: Promise<{ readonly storeSlug: string }> }) {
  const { storeSlug } = await params
  return <StorefrontScreen storeSlug={storeSlug} />
}

