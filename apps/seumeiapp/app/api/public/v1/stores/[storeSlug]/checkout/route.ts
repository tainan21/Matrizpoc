import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createCompanyServices } from "../../../../../../../src/application/composition"
import { checkoutHandler } from "../../../../../../../src/http/commerce-handlers"
import { readJson } from "../../../../../../../src/http/next-boundary"
export async function POST(request: NextRequest, context: { params: Promise<{ storeSlug: string }> }) { const services = createCompanyServices(); if (services.kind === "unavailable") return NextResponse.json({ error: "database_unavailable" }, { status: 503 }); const { storeSlug } = await context.params; const result = await checkoutHandler(storeSlug, await readJson(request), services.services.commerce); return NextResponse.json(result.body, { status: result.status, headers: { "Cache-Control": "private, no-store" } }) }
