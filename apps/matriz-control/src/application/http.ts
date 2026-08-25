const id = /^[a-z0-9][a-z0-9-]*$/

export function parseCreateSession(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid body")
  const record = value as Record<string, unknown>
  if (Object.keys(record).some((key) => !["projectId", "actionId"].includes(key))) throw new Error("Unexpected field")
  if (typeof record.projectId !== "string" || !id.test(record.projectId)) throw new Error("Invalid project")
  if (typeof record.actionId !== "string" || !id.test(record.actionId)) throw new Error("Invalid action")
  return { projectId: record.projectId, actionId: record.actionId }
}

export function parseTerminalInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid body")
  const input = (value as Record<string, unknown>).input
  if (typeof input !== "string") throw new Error("Invalid input")
  if (input.length > 4096) throw new Error("Input too large")
  return input
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin")
  if (origin && origin !== new URL(request.url).origin) throw new Error("Forbidden origin")
}

export function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error"
  const status = /Unknown/.test(message) ? 404 : /Forbidden/.test(message) ? 403 : /limit/i.test(message) ? 409 : 400
  return Response.json({ error: message }, { status })
}
