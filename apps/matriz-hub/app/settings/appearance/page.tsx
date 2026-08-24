import { redirect } from "next/navigation"
import { hasActiveHubServerSession } from "../../../src/auth/server-session"
import { AppearanceSettings } from "./AppearanceSettings"

export const dynamic = "force-dynamic"

export default async function AppearancePage() {
  if (!(await hasActiveHubServerSession())) redirect("/login")
  return <AppearanceSettings />
}
