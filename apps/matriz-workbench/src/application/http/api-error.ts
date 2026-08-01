import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { apiStatusForWorkspaceError } from "../../auth/api-error-status"
import { WorkspaceError } from "../../domain/errors"

export function apiError(error: unknown): NextResponse {
  if (error instanceof WorkspaceError) {
    const status = apiStatusForWorkspaceError(error)
    return NextResponse.json({ error: error.message, code: error.code }, { status })
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Dados da requisição inválidos.", code: "INVALID_DATA" },
      { status: 400 },
    )
  }
  return NextResponse.json(
    { error: "Falha interna no Workbench." },
    { status: 500 },
  )
}
