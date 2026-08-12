import { NextResponse, type NextRequest } from "next/server"

/** Defense-in-depth cache policy for every authenticated MatrizDocs response. */
export function proxy(_request: NextRequest) {
  const response = NextResponse.next()
  response.headers.set("cache-control", "private, no-store")
  return response
}

export const config = { matcher: ["/api/docs/:path*"] }
