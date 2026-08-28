import { distributionHttp } from "../../../../../../../../src/domains/distribution/runtime"
export async function POST(request: Request, context: { params: Promise<{ releaseId: string }> }) { return distributionHttp.retireRelease(request, (await context.params).releaseId) }

