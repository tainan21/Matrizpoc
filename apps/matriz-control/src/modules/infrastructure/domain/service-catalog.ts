import type { InfrastructureServiceId } from "./infrastructure"

export interface MatrizServiceDefinition {
  readonly id: InfrastructureServiceId
  readonly displayName: string
  readonly serviceName: string
  readonly version: string
  readonly host: "127.0.0.1"
  readonly ports: readonly number[]
  readonly relativeExecutable: string
  readonly artifact: null | {
    readonly url: string
    readonly bytes: number
    readonly sha256: string
  }
}

export const MATRIZ_SERVICE_CATALOG: readonly MatrizServiceDefinition[] = [
  {
    id: "postgres", displayName: "PostgreSQL 17", serviceName: "MatrizPostgres17", version: "17.x", host: "127.0.0.1", ports: [55432],
    relativeExecutable: "postgres/bin/pg_ctl.exe", artifact: null,
  },
  {
    id: "garnet", displayName: "Garnet", serviceName: "MatrizGarnet", version: "2.1.5", host: "127.0.0.1", ports: [56379],
    relativeExecutable: "garnet/2.1.5/net8.0/Service/Garnet.worker.exe",
    artifact: { url: "https://github.com/microsoft/garnet/releases/download/v2.1.5/win-x64-based-readytorun.zip", bytes: 49_762_902, sha256: "7d1d40254ef11dbb12bf59c07b6543a04f2b51049f515cfc9745f556f96c7466" },
  },
  {
    id: "nats", displayName: "NATS JetStream", serviceName: "MatrizNats", version: "2.14.5", host: "127.0.0.1", ports: [54222, 58222],
    relativeExecutable: "nats/2.14.5/nats-server.exe",
    artifact: { url: "https://github.com/nats-io/nats-server/releases/download/v2.14.5/nats-server-v2.14.5-windows-amd64.zip", bytes: 7_072_774, sha256: "f66f840a211ab665083b88e9b7edbcf6296cda143be47e53e6f6bb8520692bbb" },
  },
] as const
