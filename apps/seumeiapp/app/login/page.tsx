import { SharedLoginFlow } from "@matriz/flows-auth"
import { seumeiLoginSkin } from "../../src/auth/config"
import { safeReturnPath } from "../../src/application/safe-return-path"

export default async function LoginPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly returnTo?: string | readonly string[] }>
}) {
  const { returnTo } = await searchParams
  return <SharedLoginFlow skin={seumeiLoginSkin} redirectTo={safeReturnPath(typeof returnTo === "string" ? returnTo : undefined)} />
}
