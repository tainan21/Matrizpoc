import { distributionHttp } from "../../../../../../../../../src/domains/distribution/runtime"

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ productId: string; target: string; currentVersion: string }>
  },
) {
  const { productId, target, currentVersion } = await context.params
  return distributionHttp.updater(productId, target, currentVersion)
}
