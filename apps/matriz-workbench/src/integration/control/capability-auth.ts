import { timingSafeEqual } from "node:crypto"

interface ControlCapabilityEnvironment {
  WORKBENCH_CONTROL_CAPABILITY?: string
  readonly [key: string]: string | undefined
}

const errorResponse = (status: number) => Response.json(
  { error: "Control request denied." },
  { status, headers: { "Cache-Control": "no-store" } },
)

export function authorizeControlRequest(
  request: Request,
  environment: ControlCapabilityEnvironment = process.env,
): Response | undefined {
  const expected = environment.WORKBENCH_CONTROL_CAPABILITY
  if (!expected || expected.length < 32) return errorResponse(503)
  if (new URL(request.url).hostname !== "127.0.0.1") return errorResponse(403)

  const header = request.headers.get("authorization") ?? ""
  const candidate = header.startsWith("Bearer ") ? header.slice(7) : ""
  const expectedBytes = Buffer.from(expected)
  const candidateBytes = Buffer.from(candidate)
  if (
    expectedBytes.length !== candidateBytes.length ||
    !timingSafeEqual(expectedBytes, candidateBytes)
  ) return errorResponse(401)
}
