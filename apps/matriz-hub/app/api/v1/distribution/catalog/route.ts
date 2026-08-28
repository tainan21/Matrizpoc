import { distributionHttp } from "../../../../../src/domains/distribution/runtime"
export async function GET(request: Request) { return distributionHttp.catalog(request) }
