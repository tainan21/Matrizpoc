import { manifest } from "../../../src/manifest/manifest"

export function GET(): Response {
  return Response.json({ status: "ok", appId: manifest.appId, contractVersion: manifest.contractVersion })
}
