import { clientAdminHttpHandler } from "../../../../../src/domains/client-admin/runtime"
export const dynamic = "force-dynamic"
export const GET = (request: Request) => clientAdminHttpHandler()(request, "systems")
