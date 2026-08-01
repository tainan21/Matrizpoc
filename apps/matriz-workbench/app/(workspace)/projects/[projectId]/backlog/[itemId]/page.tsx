import { redirect } from "next/navigation"

export default async function LegacyBacklogItemPage({
  params,
}: {
  params: Promise<{ projectId: string; itemId: string }>
}) {
  const { projectId, itemId } = await params
  redirect(`/projects/${projectId}/backlog?item=${encodeURIComponent(itemId)}`)
}
