import { resolve } from "node:path"
import { listTerminalProjects } from "../../../src/integration/projects/project-catalog"

export const dynamic = "force-dynamic"
export async function GET() {
  const projects = await listTerminalProjects(resolve(process.cwd(), "../.."))
  return Response.json({ projects }, { headers: { "Cache-Control": "no-store" } })
}
