export class RequestBodyTooLargeError extends Error {
  constructor() { super("Request body too large") }
}

/** Reads the request stream with an enforced byte ceiling; Content-Length is only an early rejection. */
export async function readBoundedText(request: Request, limit: number): Promise<string> {
  const declared = request.headers.get("content-length")
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > limit)) throw new RequestBodyTooLargeError()
  if (!request.body) return ""
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const next = await reader.read()
      if (next.done) break
      total += next.value.byteLength
      if (total > limit) { await reader.cancel(); throw new RequestBodyTooLargeError() }
      chunks.push(next.value)
    }
  } finally { reader.releaseLock() }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes)
}
