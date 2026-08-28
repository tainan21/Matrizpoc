import { distributionHttp } from "../../../../../../src/domains/distribution/runtime"
export async function GET(request: Request, context: { params: Promise<{ productId: string }> }) {
  return distributionHttp.product(request, (await context.params).productId)
}
