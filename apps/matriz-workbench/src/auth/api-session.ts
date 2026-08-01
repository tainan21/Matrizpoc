import { NextResponse, type NextRequest } from "next/server"
import { isUnlocked } from "./session"

export async function authorizeApiRequest(
  request: NextRequest,
  mutation = false,
): Promise<NextResponse | undefined> {
  if (request.nextUrl.hostname !== "127.0.0.1") {
    return NextResponse.json({ error: "A API local aceita apenas 127.0.0.1." }, { status: 403 })
  }
  if (!(await isUnlocked())) {
    return NextResponse.json({ error: "Sessão local inválida." }, { status: 401 })
  }
  if (mutation) {
    const origin = request.headers.get("origin")
    if (!origin || origin !== request.nextUrl.origin) {
      return NextResponse.json({ error: "Origem da mutação inválida." }, { status: 403 })
    }
  }
  return undefined
}
