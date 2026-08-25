import { notFound } from "next/navigation"
import { createCompanyServices } from "../../../../src/application/composition"
import { readPublicStore } from "../../../../src/application/commerce-service"
import { SimulatedCheckout } from "../../../../src/ui/SimulatedCheckout"
import { toStoreViewModel } from "../../../../src/ui/presenters/commerce.presenter"
import { SystemState } from "../../../../src/ui/SystemState"
export default async function CheckoutPage({ params, searchParams }: { params: Promise<{ storeSlug: string }>; searchParams: Promise<{ variantId?: string }> }) { const services = createCompanyServices(); if (services.kind === "unavailable") return <SystemState kind="unavailable" />; const { storeSlug } = await params; const store = await readPublicStore(storeSlug, services.services.commerce); if (!store) notFound(); const query = await searchParams; return <SimulatedCheckout store={toStoreViewModel(store)} variantId={query.variantId ?? store.products[0]?.variantId ?? ""} /> }
