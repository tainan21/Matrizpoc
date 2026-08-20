import { monorepoConfig } from "@matriz/platform-config"
import type { SessionActor } from "../domain/company"

export type SeumeiSessionResolution =
  | { readonly kind: "authenticated"; readonly actor: SessionActor }
  | { readonly kind: "signed-out" }
  | { readonly kind: "unavailable" }

interface SessionResponse {
  readonly ok: boolean
  readonly status: number
  json(): Promise<unknown>
}

export type SessionFetcher = (
  url: string,
  init: { readonly headers: Record<string, string>; readonly cache: "no-store" },
) => Promise<SessionResponse>

function readActor(value: unknown): SessionActor | null {
  if (!value || typeof value !== "object") return null
  const session = (value as { session?: unknown }).session
  if (!session || typeof session !== "object") return null
  const identity = (session as { identity?: unknown }).identity
  if (!identity || typeof identity !== "object") return null
  const user = (identity as { user?: unknown }).user
  if (!user || typeof user !== "object") return null
  const candidate = user as Record<string, unknown>
  if (
    typeof candidate.id !== "string" || !candidate.id ||
    typeof candidate.name !== "string" ||
    typeof candidate.email !== "string" || !candidate.email
  ) return null
  return { sessionUserId: candidate.id, name: candidate.name, email: candidate.email }
}

export async function resolveSeumeiSession(
  cookie: string,
  fetcher: SessionFetcher = fetch,
): Promise<SeumeiSessionResolution> {
  try {
    const response = await fetcher(
      `${monorepoConfig.baseUrls["matriz-hub"]}/api/auth/mock/session`,
      { headers: cookie ? { cookie } : {}, cache: "no-store" },
    )
    if (response.status === 401) return { kind: "signed-out" }
    if (!response.ok) return { kind: "unavailable" }
    const actor = readActor(await response.json())
    return actor ? { kind: "authenticated", actor } : { kind: "unavailable" }
  } catch {
    return { kind: "unavailable" }
  }
}
