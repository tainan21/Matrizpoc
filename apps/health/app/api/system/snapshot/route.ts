import {
  collectSystemSnapshot,
  type DetailSampler,
  type SystemSampler,
} from "../../../../src/application/collect-system-snapshot"
import { NodeSystemSampler } from "../../../../src/integration/node-system-sampler"
import { WindowsDetailSampler } from "../../../../src/integration/windows-detail-sampler"

interface SnapshotDependencies {
  readonly system: SystemSampler
  readonly details: DetailSampler
  readonly now: () => Date
}

export function createSystemSnapshotGet(deps: SnapshotDependencies) {
  return async function GET(): Promise<Response> {
    try {
      return Response.json(await collectSystemSnapshot(deps))
    } catch {
      return Response.json({ error: "snapshot_unavailable" }, { status: 503 })
    }
  }
}

const systemSnapshotGet = createSystemSnapshotGet({
  system: new NodeSystemSampler(),
  details: new WindowsDetailSampler(),
  now: () => new Date(),
})

export async function GET(): Promise<Response> {
  return systemSnapshotGet()
}
