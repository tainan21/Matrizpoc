import { hasValidServiceToken } from "../../../../../src/auth/service-token"
import { aggregateAndRetainTelemetry } from "../../../../../src/domains/telemetry/retention"
export async function POST(request:Request){if(!hasValidServiceToken(request))return Response.json({error:"Unauthorized"},{status:401});return Response.json(await aggregateAndRetainTelemetry())}
