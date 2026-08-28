import { getCoreDb } from "@matriz/platform-db/core"
import { getOpsDb } from "@matriz/platform-db/ops"
import { manifest } from "../../../src/manifest/manifest"
export async function GET(){try{await Promise.all([getCoreDb().$queryRaw`SELECT 1`,getOpsDb().$queryRaw`SELECT 1`]);return Response.json({status:"ok",appId:manifest.appId,core:"ok",ops:"ok"})}catch{return Response.json({status:"degraded",appId:manifest.appId},{status:503})}}
