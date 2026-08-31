import { clientAdminHttpHandler } from "../../../../../src/domains/client-admin/runtime"
export const dynamic = "force-dynamic"
export async function POST(request: Request) { return clientAdminHttpHandler()(request, "overview") }
