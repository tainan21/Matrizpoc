import { notFound } from "next/navigation"

import { componentCatalog } from "../../../src/catalog/component-catalog"
import { toComponentCatalogDetailViewModel } from "../../../src/catalog/presenters"
import { findComponentBySlug } from "../../../src/catalog/query"
import { ComponentDetail } from "../../../src/ui/catalog/component-detail"

export const dynamicParams = false

export function generateStaticParams() {
  return componentCatalog.map((component) => ({ slug: component.slug }))
}

export default async function ComponentPage({
  params,
}: {
  readonly params: Promise<{ readonly slug: string }>
}) {
  const { slug } = await params
  const component = findComponentBySlug(slug)

  if (!component) notFound()

  return (
    <main className="component-detail-page" id="main-content">
      <ComponentDetail component={toComponentCatalogDetailViewModel(component)} />
    </main>
  )
}
