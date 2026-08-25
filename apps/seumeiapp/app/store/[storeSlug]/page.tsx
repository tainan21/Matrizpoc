import { notFound } from "next/navigation"
import { createCompanyServices } from "../../../src/application/composition"
import { readPublicStore } from "../../../src/application/commerce-service"
import { Storefront } from "../../../src/ui/Storefront"
import { toStoreViewModel } from "../../../src/ui/presenters/commerce.presenter"
import { SystemState } from "../../../src/ui/SystemState"
export default async function StorePage({ params }: { params: Promise<{ storeSlug: string }> }) { const services = createCompanyServices(); if (services.kind === "unavailable") return <SystemState kind="unavailable" />; const { storeSlug } = await params; const store = await readPublicStore(storeSlug, services.services.commerce); if (!store) notFound(); return <Storefront store={toStoreViewModel(store)} /> }
