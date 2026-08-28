import { distributionHttp } from "../../../../../../../src/domains/distribution/runtime"
export async function PATCH(request: Request, context: { params: Promise<{ productId: string }> }) { return distributionHttp.updateProduct(request, (await context.params).productId) }

