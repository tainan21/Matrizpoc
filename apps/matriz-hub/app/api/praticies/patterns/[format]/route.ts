import { filesystemPatternsGenerator } from "../../../../../src/domains/praticies/integration/filesystem/patterns-generator"
import { hasActiveHubServerSession } from "../../../../../src/auth/server-session"

export const dynamic = "force-dynamic"

const artifactConfig = {
  human: {
    filename: "folders.human.md",
    contentType: "text/markdown; charset=utf-8",
  },
  llm: {
    filename: "folders.llm.json",
    contentType: "application/json; charset=utf-8",
  },
} as const

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ format: string }> },
) {
  if (!(await hasActiveHubServerSession())) {
    return Response.json({ error: "Sessão necessária." }, { status: 401 })
  }

  const { format } = await params
  if (format !== "human" && format !== "llm") {
    return Response.json({ error: "Formato de pattern inválido." }, { status: 404 })
  }

  const content = await filesystemPatternsGenerator.readArtifact(format)
  if (!content) {
    return Response.json(
      { error: "Pattern ainda não gerado neste workspace." },
      { status: 404 },
    )
  }

  const config = artifactConfig[format]
  return new Response(content, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${config.filename}"`,
      "Content-Type": config.contentType,
    },
  })
}
