import { spawnSync } from "node:child_process"

type Spawn = typeof spawnSync

export function executeTopologySql(
  sql: string,
  options: {
    databaseUrl?: string
    environment?: NodeJS.ProcessEnv
    cwd?: string
    platform?: NodeJS.Platform
    spawn?: Spawn
  } = {},
): void {
  const environment = options.environment ?? process.env
  const result = (options.spawn ?? spawnSync)(
    (options.platform ?? process.platform) === "win32" ? "pnpm.cmd" : "pnpm",
    ["exec", "prisma", "db", "execute", "--stdin", "--schema", "prisma/core/schema.prisma"],
    {
      cwd: options.cwd ?? process.cwd(),
      env: { ...environment, CORE_DATABASE_URL: options.databaseUrl ?? environment.NEON_PRIMARY_DATABASE_URL },
      input: sql,
      encoding: "utf8",
    },
  )
  if (result.status !== 0) {
    // Provider/subprocess output may contain a connection URL. Never forward it.
    throw new Error(`Database topology command failed (${result.status ?? "unknown"})`)
  }
}
