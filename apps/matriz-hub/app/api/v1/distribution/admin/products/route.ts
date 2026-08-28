import { distributionHttp } from "../../../../../../src/domains/distribution/runtime"
export async function POST(request: Request) { return distributionHttp.createProduct(request) }
