import { NextResponse } from "next/server"
import { createCompanyServices } from "../../../../../../src/application/composition"
import { readPublicStore } from "../../../../../../src/application/commerce-service"
export async function GET(_: Request, context: { params: Promise<{ storeSlug: string }> }) { const services = createCompanyServices(); if (services.kind === "unavailable") return NextResponse.json({ error: "database_unavailable" }, { status: 503 }); const { storeSlug } = await context.params; const store = await readPublicStore(storeSlug, services.services.commerce); return NextResponse.json(store ? { store } : { error: "store_not_found" }, { status: store ? 200 : 404, headers: { "Cache-Control": store ? "public, max-age=30, stale-while-revalidate=60" : "no-store" } }) }
