import { distributionHttp } from "../../../../../../../../src/domains/distribution/runtime"
export async function POST(request: Request, context: { params: Promise<{ productId: string }> }) { return distributionHttp.createRelease(request, (await context.params).productId) }

