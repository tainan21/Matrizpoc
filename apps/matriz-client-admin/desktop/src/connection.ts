export function trustedWebOrigin(raw: string | undefined, mode: "development" | "production"): string {
  let url: URL
  try { url = new URL(raw ?? "") } catch { throw new Error("CLIENT_ADMIN_WEB_ORIGIN must be an absolute URL") }
  const local = (url.hostname === "127.0.0.1" || url.hostname === "localhost") && url.protocol === "http:"
  if (mode === "development" ? !(local || url.protocol === "https:") : url.protocol !== "https:") throw new Error("Client Admin desktop requires a trusted HTTPS origin")
  if (url.username || url.password || url.search || url.hash) throw new Error("Client Admin desktop origin cannot include credentials or fragments")
  return url.toString()
}
